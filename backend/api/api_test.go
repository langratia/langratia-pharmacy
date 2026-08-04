package api_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	
	"app/backend/api"
)

type MockTarget struct{}

func (m *MockTarget) Add(a, b float64) float64 { // Use float64 as json marshals numbers to float64
	return a + b
}

func (m *MockTarget) Echo(msg string) (string, error) {
	if msg == "error" {
		return "", errors.New("echo error")
	}
	return "echo: " + msg, nil
}

func (m *MockTarget) GetStruct() struct{ Name string } {
	return struct{ Name string }{Name: "test"}
}

func TestHandleRPC(t *testing.T) {
	target := &MockTarget{}

	tests := []struct {
		name           string
		method         string
		args           []interface{}
		expectedResult interface{}
		expectedError  string
		httpStatus     int
	}{
		{
			name:           "Valid Method No Error",
			method:         "Add",
			args:           []interface{}{5.0, 7.0},
			expectedResult: float64(12),
			expectedError:  "",
			httpStatus:     http.StatusOK,
		},
		{
			name:           "Valid Method With Error Result",
			method:         "Echo",
			args:           []interface{}{"error"},
			expectedResult: nil,
			expectedError:  "echo error",
			httpStatus:     http.StatusOK,
		},
		{
			name:           "Invalid Method",
			method:         "NotFound",
			args:           []interface{}{},
			expectedResult: nil,
			expectedError:  "Method NotFound not found",
			httpStatus:     http.StatusOK,
		},
		{
			name:           "Wrong Argument Count",
			method:         "Add",
			args:           []interface{}{5.0},
			expectedResult: nil,
			expectedError:  "Method Add expects 2 arguments, got 1",
			httpStatus:     http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			reqBody, _ := json.Marshal(api.RPCRequest{
				Method: tc.method,
				Args:   tc.args,
			})

			req, err := http.NewRequest("POST", "/rpc", bytes.NewReader(reqBody))
			if err != nil {
				t.Fatal(err)
			}

			rr := httptest.NewRecorder()
			api.HandleRPC(target, rr, req)

			if status := rr.Code; status != tc.httpStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tc.httpStatus)
			}

			if tc.httpStatus == http.StatusOK {
				var resp api.RPCResponse
				if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}

				if resp.Error != tc.expectedError {
					t.Errorf("expected error %q, got %q", tc.expectedError, resp.Error)
				}

				if tc.expectedResult != nil {
					if resp.Result != tc.expectedResult {
						t.Errorf("expected result %v, got %v", tc.expectedResult, resp.Result)
					}
				}
			}
		})
	}
}

func TestCallRPC(t *testing.T) {
	target := &MockTarget{}
	
	// Create a test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.HandleRPC(target, w, r)
	}))
	defer ts.Close()

	// Test a successful call returning a string
	var echoResult string
	err := api.CallRPC(ts.URL, "Echo", &echoResult, "hello")
	if err != nil {
		t.Fatalf("CallRPC failed: %v", err)
	}
	if echoResult != "echo: hello" {
		t.Errorf("expected 'echo: hello', got %q", echoResult)
	}

	// Test an error return
	err = api.CallRPC(ts.URL, "Echo", nil, "error")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "server error: echo error" {
		t.Errorf("unexpected error message: %v", err)
	}

	// Test returning a struct
	var structResult struct{ Name string }
	err = api.CallRPC(ts.URL, "GetStruct", &structResult)
	if err != nil {
		t.Fatalf("CallRPC failed: %v", err)
	}
	if structResult.Name != "test" {
		t.Errorf("expected struct Name to be 'test', got %q", structResult.Name)
	}
}
