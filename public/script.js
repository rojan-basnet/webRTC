const startbtn = document.getElementById("startbtn");
const callEnd = document.getElementById("callEnd");

const socket = io();

// Global PeerConnection (needed everywhere)
let pc;
let localStream;
let pendingCandidates = [];

// ------------------ BUTTONS ------------------

startbtn.addEventListener("click", () => {
    makeCall();
});

callEnd.addEventListener("click", () => {
    handleCallEnd();
});

// ------------------ START CAMERA ------------------

async function startCamera(pc) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        const videoElement = document.getElementById('localVideo');
        videoElement.srcObject = localStream;

        // Add tracks to PeerConnection
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

    } catch (error) {
        console.error("Camera error:", error);
    }
}

// ------------------ END CALL ------------------

function handleCallEnd() {
    try {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        document.getElementById("localVideo").srcObject = null;

        if (pc) pc.close();

        console.log("Call Ended");

    } catch (error) {
        console.log(error);
    }
}

// ------------------ MAKE CALL (offer) ------------------

async function makeCall() {
    pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.metered.ca:3478" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "35340fdf480622587c49a4fe",
      credential: "rNLeqnlRgqcKRzRp"
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "35340fdf480622587c49a4fe",
      credential: "rNLeqnlRgqcKRzRp"
    }
  ]
    });

    // ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("candidate", event.candidate);
        }
    };

    // When remote video comes
    pc.ontrack = (event) => {
        console.log("tracks received by caller", event.streams[0])
        document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    await startCamera(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log("Sending Offer:", offer);

    socket.emit("offer", offer);
}

// ------------------ SOCKET EVENTS ------------------

// When you receive an offer
socket.on("offer", async (offer) => {
    console.log("Received Offer:", offer);

    pc = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
        ]
    });

    pc.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("candidate", event.candidate);
        }
    };

    pc.ontrack = (event) => {
        console.log("Tracks received:", event.streams[0]);
        document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    await startCamera(pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    for (const c of pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
    }
    pendingCandidates = [];
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("answer", answer);
});


socket.on("answer", async (answer) => {
    console.log("Received Answer:", answer);

    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    for (const c of pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
    }
    pendingCandidates = [];
});


// Receive candidate
socket.on("candidate", async (data) => {

    const candidate = data.msg.candidate

    if (!pc.remoteDescription) {
        pendingCandidates.push(data.msg);
        return;
    }

    if (!candidate || !pc) return console.log("No ice candidate");// ignore null
    try {
        const iceCandidateInit = {
            candidate: candidate,
            sdpMid: data.msg.sdpMid,
            sdpMLineIndex: data.msg.sdpMLineIndex
        };
        await pc.addIceCandidate(new RTCIceCandidate(iceCandidateInit));
        console.log("Added ICE candidate");
    } catch (e) {
        console.error("Error adding ICE candidate:", e);
    }
});
