package network

import (
	"fmt"
	"net"
	"os"
	"strings"
	"time"

	"app/backend/logger"
)

const (
	DiscoveryPort = 45555
	MagicRequest  = "LANGRATIA_DISCOVER"
	MagicResponse = "LANGRATIA_SERVER"
)

// StartServerListener starts a UDP listener on the specified port.
// When it receives a MagicRequest, it replies with the server's hostname and API URL.
func StartServerListener() {
	addr := net.UDPAddr{
		Port: DiscoveryPort,
		IP:   net.ParseIP("0.0.0.0"),
	}

	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		logger.Error("Failed to start UDP discovery listener: %v", err)
		return
	}
	defer conn.Close()

	logger.Info("UDP Discovery Listener started on port %d", DiscoveryPort)

	buf := make([]byte, 1024)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buf)
		if err != nil {
			if strings.Contains(err.Error(), "use of closed network connection") {
				return
			}
			logger.Error("UDP read error: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		msg := string(buf[:n])
		if strings.TrimSpace(msg) == MagicRequest {
			hostname, _ := os.Hostname()
			if hostname == "" {
				hostname = "UNKNOWN_HOST"
			}
			
			// Find the primary local IP address to construct the API URL
			localIP := "127.0.0.1"
			addrs, err := net.InterfaceAddrs()
			if err == nil {
				for _, address := range addrs {
					if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
						localIP = ipnet.IP.String()
						break
					}
				}
			}

			// Format: LANGRATIA_SERVER|HOSTNAME|http://IP:45556
			response := fmt.Sprintf("%s|%s|http://%s:45556", MagicResponse, hostname, localIP)
			_, err = conn.WriteToUDP([]byte(response), remoteAddr)
			if err != nil {
				logger.Error("Failed to send UDP response to %v: %v", remoteAddr, err)
			}
		}
	}
}

// DiscoverServer broadcasts a UDP request to the local network and waits for a response.
// Returns the constructed API URL (e.g., "http://192.168.1.50:45556") or empty string if not found.
func DiscoverServer() (string, error) {
	// Enable SO_BROADCAST on the connection
	addr := net.UDPAddr{
		IP:   net.IPv4bcast, // 255.255.255.255
		Port: DiscoveryPort,
	}

	conn, err := net.DialUDP("udp", nil, &addr)
	if err != nil {
		return "", fmt.Errorf("failed to dial UDP broadcast: %v", err)
	}
	defer conn.Close()

	// Write broadcast message
	_, err = conn.Write([]byte(MagicRequest))
	if err != nil {
		return "", fmt.Errorf("failed to send UDP broadcast: %v", err)
	}

	// Wait for response with a 3-second timeout
	conn.SetReadDeadline(time.Now().Add(3 * time.Second))

	buf := make([]byte, 1024)
	n, _, err := conn.ReadFromUDP(buf)
	if err != nil {
		return "", fmt.Errorf("no server found on network within timeout")
	}

	msg := string(buf[:n])
	parts := strings.Split(msg, "|")
	
	if len(parts) == 3 && parts[0] == MagicResponse {
		apiUrl := parts[2]
		return apiUrl, nil
	}

	return "", fmt.Errorf("received invalid response format from server")
}
