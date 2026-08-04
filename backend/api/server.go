package api

import (
	"fmt"
	"net/http"
)

// StartServer starts the HTTP RPC server on port 45556.
func StartServer(target interface{}) {
	http.HandleFunc("/rpc", func(w http.ResponseWriter, r *http.Request) {
		// CORS headers for local network testing if needed
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		HandleRPC(target, w, r)
	})

	addr := ":45556"
	fmt.Printf("API Server listening on %s\n", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		fmt.Printf("API Server failed: %v\n", err)
	}
}
