package network

import (
	"fmt"
	"net"
	"os"
	"strings"
	"time"
)

const (
	DiscoveryPort = 45555
	MagicRequest  = "LANGRATIA_DISCOVER"
	MagicResponse = "LANGRATIA_SERVER"
)

// StartServerListener starts a UDP listener on the specified port.
// When it receives a MagicRequest, it replies with the server's hostname and the shared folder name.
func StartServerListener(shareName string) {
	addr := net.UDPAddr{
		Port: DiscoveryPort,
		IP:   net.ParseIP("0.0.0.0"),
	}

	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		fmt.Printf("Failed to start UDP discovery listener: %v\n", err)
		return
	}
	defer conn.Close()

	fmt.Printf("UDP Discovery Listener started on port %d\n", DiscoveryPort)

	buf := make([]byte, 1024)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buf)
		if err != nil {
			fmt.Printf("UDP read error: %v\n", err)
			continue
		}

		msg := string(buf[:n])
		if strings.TrimSpace(msg) == MagicRequest {
			hostname, _ := os.Hostname()
			if hostname == "" {
				hostname = "UNKNOWN_HOST"
			}
			
			// Format: LANGRATIA_SERVER|HOSTNAME|SHARE_NAME
			response := fmt.Sprintf("%s|%s|%s", MagicResponse, hostname, shareName)
			_, err := conn.WriteToUDP([]byte(response), remoteAddr)
			if err != nil {
				fmt.Printf("Failed to send UDP response to %v: %v\n", remoteAddr, err)
			}
		}
	}
}

// DiscoverServer broadcasts a UDP request to the local network and waits for a response.
// Returns the constructed remote database path (e.g., "\\HOSTNAME\ShareName\pharmacy.db") or empty string if not found.
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
		hostname := parts[1]
		shareName := parts[2]
		
		// Construct the UNC path for Windows SMB: \\HOSTNAME\ShareName\pharmacy.db
		path := fmt.Sprintf("\\\\%s\\%s\\pharmacy.db", hostname, shareName)
		return path, nil
	}

	return "", fmt.Errorf("received invalid response format from server")
}
