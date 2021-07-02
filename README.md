# Homie Datagram Protocol

***EXPERIMENTAL! DON'T EXPECT THIS TO BE STABLE!***

This is a client for the *Homie Datagram Protocol (HDP)*. A server implementation can be found here: [homie/hdp](https://github.com/jue89/homie/tree/main/firmware/sys/hdp)

## API

```js
const hdpFactory = require('homie-dgram');
hdpFactory([opts]).then((hdpClient) => { ... });
```
* `opts` has the following items:
   * `port`: UDP port to be bound. Default: `5001`
   * `mcast`: Multicast group to join. Default: `'ff02::cafe'`
* `hdpClient`: Instance of **HDPClient**

### Class: HDPClient

#### Event: discover

```js
hdpClient.on('discover', (hdpDevice) => { ... });
```

Is fired once a HDPDevice has been discovered.

#### Method: triggerDiscovery()

```js
hdpClient.triggerDiscovery([opts]);
```

Triggers discovery by requesting the current state of all reachable HDP devices.

`opts` has the following options:
* `port`: hdpDevice's port. Default: `5000`
* `mcast`: Multicast address for the request. Default: `'ff02::1'`.
* `iface`: Network interface to query. Default: all network interfaces with IPv6 connectivity.

#### Method: get()

```js
hdpClient.get(cpuid[, timeout]).then((hdpDevice) => { ... });
```

* `cpuid`: Hex string of the hdpDevice's CPUID
* `timeout`: Amount of millisecods to wait for the given device to be discovered. Default: `20000`.
* `hdpDevice`: Instance of HDPDevice

#### Method: getAll()

```js
const hdpDevices = hdpClient.getAll();
```

* `hdpDevices`: Array of HDPDevice that have been discovered, yet.

#### Method: close()

```js
hdpClient.close().then(() => { ... });
```

Closes the network socket.

### Class: HDPDevice

#### Property: cpuid

CPUID of hdpDevice.

#### Property: uptime

Uptime in milliseconds of the hdpDevice.

#### Method: get()

```js
const hdpEndpoint = hdpDevice.get(name)
```

* `name`: Name of the endpoint
* `hdpEndpoint`: Instance of HDPEndpoint

### Class HDPEnpoint

#### Property: name

Name of the hdpEndpoint.

#### Property: type

Type of the hdpEndpoint.

#### Property: writable

Flag indicating that the endpoint is writable.

#### Property: readable

Flag indicating that the endpoint is readable.

#### Event: change

```js
hdpEndpoint.on('change', (newVal, oldVal) => { ... });
```

Is fired once the endpoint's value has changed.

* `newVal`: Endpoints new value
* `oldVal`: Endpoints old value

#### Method: get()

```js
val = hdpEndpoint.get();
```

Precondition: `hdpEndpoint.readable === true`;

Gets the current value of the endpoint.

#### Method: set()

```js
await hdpEndpoint.set(val);
```

Precondition: `hdpEndpoint.writable === true`;

Writes the value of the endpoint.

