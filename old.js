const startbtn =document.getElementById("startbtn")
const callEnd=document.getElementById("callEnd")
const socket = io()
startbtn.addEventListener("click",()=>{callStart()})
callEnd.addEventListener("click",()=>handleCallEnd())


async function callStart(pc) {
    socket.emit("message","calling")
    try {
        const constraints = {'video': true, 'audio': true};
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.getElementById('localVideo');
        stream.getTracks().forEach(track => pc.addTrack(track, stream));    
        videoElement.srcObject = stream;
    } catch(error) {
        console.error('Error opening video camera.', error);
    }
}

function handleCallEnd(){
    try{
        const videoElement = document.getElementById('localVideo');
        stream=videoElement.srcObject;
        if(stream){
            const tracks=stream.getTracks()
            tracks.forEach(track=>track.stop())
            videoElement.srcObject=null
        }
    }catch(error){
        console.log(error)
    
    }
}



async function makeCall() {
    const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
    const peerConnection = new RTCPeerConnection(configuration);
    callStart(peerConnection)
    const offer = await peerConnection.createOffer();
    console.log({offer})
    await peerConnection.setLocalDescription(offer);
    console.log({offer},"sending")
    socket.emit('offer', offer);
}
socket.on('offer',(offer)=>{
    console.log({offer})
})

socket.on('answer', async message => {
    if (message.answer) {
        const remoteDesc = new RTCSessionDescription(message.answer);
        await peerConnection.setRemoteDescription(remoteDesc);
        socket.emit('answer', answer);
    }
});
