const {EventEmitter} = require('events');

module.exports.createSocket = jest.fn(() => {
	const socket = new EventEmitter();
	socket.send = jest.fn();
	socket.bind = jest.fn((_, cb) => cb());
	socket.addMembership = jest.fn();
	return socket;
});
