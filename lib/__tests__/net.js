jest.mock('dgram');
const mockDgram = require('dgram');

const parsePkt = jest.fn(() => ({cpuid: 'abcdef'}));

const {Socket} = require('../net.js')({parsePkt});

const addEventListener = (emitter, eventName) => {
	const listener = jest.fn();
	emitter.on(eventName, listener);
	return listener;
};

test('parse incoming packets', () => {
	const s = new Socket();
	const udpSocket = mockDgram.createSocket.mock.results[0].value;
	const payload = Buffer.alloc(0);
	const onPkt = addEventListener(s, 'pkt');
	udpSocket.emit('message', payload, {});
	expect(parsePkt.mock.calls[0][0]).toBe(payload);
	expect(onPkt.mock.calls[0][0]).toBe(parsePkt.mock.results[0].value);
});

test('throw parsing errors', () => {
	const s = new Socket();
	const udpSocket = mockDgram.createSocket.mock.results[0].value;
	const onClientError = addEventListener(s, 'clientError');
	const err = new Error('FOOO');
	parsePkt.mockImplementationOnce(() => { throw err; });
	const rinfo = {};
	udpSocket.emit('message', Buffer.alloc(0), rinfo);
	expect(onClientError.mock.calls[0][0]).toBe(err);
	expect(onClientError.mock.calls[0][1]).toBe(rinfo);
});

test('learn address and port of devices', () => {
	const s = new Socket();
	const udpSocket = mockDgram.createSocket.mock.results[0].value;
	const rinfo = { address: 'Entenhausen', port: 1337 };
	udpSocket.emit('message', Buffer.alloc(0), rinfo);
	const buf0 = Buffer.alloc(0);
	const pkt0 = {
		cpuid: parsePkt.mock.results[0].value.cpuid,
		toBuffer: () => buf0
	};
	s.send(pkt0);
	expect(udpSocket.send.mock.calls[0][0]).toBe(buf0);
	expect(udpSocket.send.mock.calls[0][1]).toBe(rinfo.port);
	expect(udpSocket.send.mock.calls[0][2]).toBe(rinfo.address);
	expect(() => s.send({cpuid: '1234567890'})).toThrow('Unknown destination');
});

test('send packet to specified rinfo', () => {
	const s = new Socket();
	const udpSocket = mockDgram.createSocket.mock.results[0].value;
	const rinfo = { address: 'Entenhausen', port: 1337 };
	const buf0 = Buffer.alloc(0);
	const pkt0 = { toBuffer: () => buf0 };
	s.send(pkt0, rinfo);
	expect(udpSocket.send.mock.calls[0][0]).toBe(buf0);
	expect(udpSocket.send.mock.calls[0][1]).toBe(rinfo.port);
	expect(udpSocket.send.mock.calls[0][2]).toBe(rinfo.address);
});

test('bind socket', async () => {
	const s = new Socket();
	const udpSocket = mockDgram.createSocket.mock.results[0].value;
	await s.bind();
	expect(udpSocket.bind.mock.calls[0][0]).toEqual(5001);
	expect(udpSocket.addMembership.mock.calls[0][0]).toEqual('ff02::cafe');
	await s.bind(123, 'ff02::1');
	expect(udpSocket.bind.mock.calls[1][0]).toEqual(123);
	expect(udpSocket.addMembership.mock.calls[1][0]).toEqual('ff02::1');
});
