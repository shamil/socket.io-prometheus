process.env.NODE_ENV = 'test';

const {EventEmitter} = require('events');
const {expect} = require('chai');
const sinon = require('sinon');

const promCollector = require('rewire')('./');

describe('socket.io metrics: internal functions', () => {
  // retrieve unexported functions
  let strToBytes = promCollector.__get__('strToBytes'),
    beforeHook = promCollector.__get__('beforeHook');

  it('strToBytes works with UTF8 string', () => {
    expect(strToBytes("Шамиль")).to.eq(12);
  });

  it('strToBytes works with non-UTF8 string', () => {
    expect(strToBytes("Shamil")).to.eq(6);
  });

  it('strToBytes works with object', () => {
    expect(strToBytes({mesage: "Hello World!"})).to.eq(25);
  });

  it('strToBytes returns 0 on exception or undefined', () => {
    let obj = {};
    obj.a = {b: obj};

    expect(strToBytes(obj)).to.eq(0);
    expect(strToBytes(undefined)).to.eq(0);
  });

  it('beforeHook returns false if first arg is undefined', () => {
    expect(beforeHook()).to.eq(false);
  });

  it('beforeHook must not change returned value', () => {
    let obj = {func: (a) => a};

    beforeHook(obj, 'func', (a) => {
      a = 0;
    });
    expect(obj.func(10)).to.not.eq(0);
  });

  it('beforeHook must catch hook exceptions', () => {
    let obj = {func: (a) => a};

    beforeHook(obj, 'func', () => {
      throw new Error('something went wrong');
    });
    expect(obj.func(10)).to.eq(10);
  });
});

describe('socket.io metrics: collector', () => {
  const socket = new EventEmitter();
  const io = new EventEmitter();

  promCollector(io);

  // retrieve unexported metrix variable
  const metrics = promCollector.__get__('metrics');

  const connectedSockets = metrics.connectedSockets;
  const connectTotal = metrics.connectTotal;
  const disconnectTotal = metrics.disconnectTotal;
  const eventsReceivedTotal = metrics.eventsReceivedTotal;
  const eventsSentTotal = metrics.eventsSentTotal;
  const bytesReceived = metrics.bytesReceived;
  const bytesTransmitted = metrics.bytesTransmitted;

  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('on connect - connectTotal and connectedSockets should increment', () => {
    sandbox.spy(connectTotal, 'inc');
    sandbox.spy(connectedSockets, 'inc');

    io.emit('connect', socket);
    expect(connectTotal.inc.callCount).to.eq(1);
    expect(connectedSockets.inc.callCount).to.eq(1);
  });

  it('on socket disconnect - disconnectTotal should increment and connectedSockets should decrement', () => {
    sandbox.spy(connectedSockets, 'dec');
    sandbox.spy(disconnectTotal, 'inc');

    socket.emit('disconnect');
    expect(connectedSockets.dec.callCount).to.eq(1);
    expect(disconnectTotal.inc.callCount).to.eq(1);
  });

  it('on socket emit - bytesTransmitted and eventsSentTotal should increment', () => {
    let bytesTransmittedInc = sandbox.spy(),
      eventsSentTotalInc = sandbox.spy();

    sandbox.stub(bytesTransmitted, 'labels').returns({inc: bytesTransmittedInc});
    sandbox.stub(eventsSentTotal, 'labels').returns({inc: eventsSentTotalInc});

    socket.emit('test event');
    expect(bytesTransmittedInc.callCount).to.eq(1);
    expect(eventsSentTotalInc.callCount).to.eq(1);
  });

  it('on socket emit newListener - bytesTransmitted and eventsSentTotal should not increment', () => {
    let bytesTransmittedInc = sandbox.spy(),
      eventsSentTotalInc = sandbox.spy();

    sandbox.stub(bytesTransmitted, 'labels').returns({inc: bytesTransmittedInc});
    sandbox.stub(eventsSentTotal, 'labels').returns({inc: eventsSentTotalInc});

    socket.emit('newListener');
    expect(bytesTransmittedInc.callCount).to.eq(0);
    expect(eventsSentTotalInc.callCount).to.eq(0);
  });

  it('on socket event - bytesReceived and eventsReceivedTotal should increment', (done) => {
    let bytesReceivedInc = sandbox.spy(),
      eventsReceivedTotalInc = sandbox.spy();

    sandbox.stub(bytesReceived, 'labels').returns({inc: bytesReceivedInc});
    sandbox.stub(eventsReceivedTotal, 'labels').returns({inc: eventsReceivedTotalInc});

    socket.on('event', () => {
      expect(bytesReceivedInc.callCount).to.eq(1);
      expect(eventsReceivedTotalInc.callCount).to.eq(1);
      done();
    });

    socket.emit('event');
  });

  it('on socket disconnect event - bytesReceived and eventsReceivedTotal should not increment', (done) => {
    let bytesReceivedInc = sandbox.spy(),
      eventsReceivedTotalInc = sandbox.spy();

    sandbox.stub(bytesReceived, 'labels').returns({inc: bytesReceivedInc});
    sandbox.stub(eventsReceivedTotal, 'labels').returns({inc: eventsReceivedTotalInc});

    socket.on('disconnect', () => {
      expect(bytesReceivedInc.callCount).to.eq(0);
      expect(eventsReceivedTotalInc.callCount).to.eq(0);
      done();
    });

    socket.emit('disconnect');
  });
});
