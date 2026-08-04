package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"reflect"
)

type RPCRequest struct {
	Method string        `json:"method"`
	Args   []interface{} `json:"args"`
}

type RPCResponse struct {
	Result interface{} `json:"result,omitempty"`
	Error  string      `json:"error,omitempty"`
}

// CallRPC invokes an RPC method on the target server.
// url: The base URL of the API server (e.g., http://192.168.1.50:45556)
// method: The name of the method to call on the *App struct (e.g., "Login")
// reply: A pointer to the struct to deserialize the result into. Use nil if the method returns no result.
// args: The arguments to pass to the method.
func CallRPC(url string, method string, reply interface{}, args ...interface{}) error {
	reqData := RPCRequest{
		Method: method,
		Args:   args,
	}

	b, err := json.Marshal(reqData)
	if err != nil {
		return fmt.Errorf("failed to marshal rpc request: %w", err)
	}

	resp, err := http.Post(url+"/rpc", "application/json", bytes.NewReader(b))
	if err != nil {
		return fmt.Errorf("rpc post failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read rpc response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var rpcResp RPCResponse
	if err := json.Unmarshal(respBody, &rpcResp); err != nil {
		return fmt.Errorf("failed to unmarshal rpc response: %w", err)
	}

	if rpcResp.Error != "" {
		return fmt.Errorf("server error: %s", rpcResp.Error)
	}

	if reply != nil && rpcResp.Result != nil {
		// Re-marshal the result part to unmarshal into the specific reply type
		resBytes, _ := json.Marshal(rpcResp.Result)
		if err := json.Unmarshal(resBytes, reply); err != nil {
			return fmt.Errorf("failed to decode result into reply: %w", err)
		}
	}

	return nil
}

// HandleRPC processes an incoming RPC request and invokes the corresponding method on the target object via reflection.
func HandleRPC(target interface{}, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}

	var req RPCRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	targetValue := reflect.ValueOf(target)
	methodValue := targetValue.MethodByName(req.Method)
	
	if !methodValue.IsValid() {
		writeRPCError(w, fmt.Sprintf("Method %s not found", req.Method))
		return
	}

	methodType := methodValue.Type()
	if methodType.NumIn() != len(req.Args) {
		writeRPCError(w, fmt.Sprintf("Method %s expects %d arguments, got %d", req.Method, methodType.NumIn(), len(req.Args)))
		return
	}

	in := make([]reflect.Value, len(req.Args))
	for i, arg := range req.Args {
		argType := methodType.In(i)
		
		// Unmarshal the argument into the expected type
		argBytes, _ := json.Marshal(arg)
		argPtr := reflect.New(argType)
		
		if err := json.Unmarshal(argBytes, argPtr.Interface()); err != nil {
			writeRPCError(w, fmt.Sprintf("Failed to unmarshal argument %d: %v", i, err))
			return
		}
		
		in[i] = argPtr.Elem()
	}

	out := methodValue.Call(in)
	
	var rpcResp RPCResponse
	
	if len(out) > 0 {
		lastOut := out[len(out)-1]
		if lastOut.Type().Implements(reflect.TypeOf((*error)(nil)).Elem()) {
			if !lastOut.IsNil() {
				rpcResp.Error = lastOut.Interface().(error).Error()
			}
			out = out[:len(out)-1]
		}
	}

	if len(out) > 0 {
		rpcResp.Result = out[0].Interface()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rpcResp)
}

func writeRPCError(w http.ResponseWriter, errMsg string) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RPCResponse{Error: errMsg})
}
