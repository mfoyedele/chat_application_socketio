const app = require('express')();
const httpServer = require('http').createServer(app);
const cors = require('cors');

const options = {
  cors: {
    origin: 'https://chat-app-omf.netlify.app',
    methods: ['GET', 'POST'],
    credentials: true,
  },
};

const io = require('socket.io')(httpServer, options);

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users.js');

const router = require('./router');

app.use(cors());
app.use(router);

const PORT = process.env.PORT || 5000;

io.on('connection', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit('message', {
      user: 'admin',
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit('message', { user: 'admin', text: `${user.name} has joined!` });

    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });
  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', { user: user.name, text: message });

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', {
        user: 'Admin',
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});
httpServer.listen(process.env.PORT || 5000, () =>
  console.log(`Server has started. ${PORT}`)
);
