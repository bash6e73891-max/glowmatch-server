const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

let waitingUser = null

app.get('/', (req, res) => res.send('GlowMatch server running 🔥'))

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Match users together
  if (waitingUser && waitingUser.id !== socket.id) {
    const partner = waitingUser
    waitingUser = null

    socket.partner = partner
    partner.partner = socket

    socket.emit('matched', { initiator: true })
    partner.emit('matched', { initiator: false })
    console.log('Matched:', socket.id, '<->', partner.id)
  } else {
    waitingUser = socket
    socket.emit('waiting')
  }

  // WebRTC signaling
  socket.on('signal', (data) => {
    if (socket.partner) {
      socket.partner.emit('signal', data)
    }
  })

  // Chat messages
  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', msg)
    }
  })

  // Photo sharing
  socket.on('photo', (data) => {
    if (socket.partner) {
      socket.partner.emit('photo', data)
    }
  })

  // Skip to next match
  socket.on('skip', () => {
    if (socket.partner) {
      socket.partner.emit('partner_left')
      socket.partner.partner = null
    }
    socket.partner = null

    if (waitingUser && waitingUser.id !== socket.id) {
      const partner = waitingUser
      waitingUser = null
      socket.partner = partner
      partner.partner = socket
      socket.emit('matched', { initiator: true })
      partner.emit('matched', { initiator: false })
    } else {
      waitingUser = socket
      socket.emit('waiting')
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    if (socket.partner) {
      socket.partner.emit('partner_left')
      socket.partner.partner = null
    }
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log('GlowMatch server on port', PORT))