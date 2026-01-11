import express from 'express';
import http from 'http'
import { Server } from 'socket.io';


const app=express()

app.use(express.json())
const server = http.createServer(app);
const io=new Server(server)

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('candidate', (msg) => {
        socket.broadcast.emit('candidate', {form:socket.id,msg});
    });
    socket.on('offer',(offer)=>{
        console.log("recieved",offer)
        socket.broadcast.emit('offer',offer)
    })
    socket.on('answer',(ans)=>{
        socket.broadcast.emit('answer',ans)
    })
    socket.on('disconnect', () => {
        console.log('A user disconnected: ' + socket.id);
    });
});

server.listen(3000,()=>{
    console.log('server running')
})