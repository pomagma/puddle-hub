'use strict';
var assert = require('assert');
var Hub = require('../index.js');
var uuid = require('node-uuid');

describe('Hub instance', function () {
    var hub;
    var id;
    var object;
    var object2;
    beforeEach(function () {
        id = uuid();
        hub = new Hub();
        object = {code: 'I\'m an object'};
        object2 = {code: 'I\'m another object'};
    });
    it('throws if not a function given as an event callback', function () {
        assert.throws(function () {
            hub.on('create', {});
        });
    });
    describe('create', function () {
        describe('throws if ', function () {
            it('ID or Object are not passed', function () {
                assert.throws(function () {
                    hub.create();
                });
            });
            it('passed ID is not a string', function () {
                assert.throws(function () {
                    hub.create(1, object);
                });

                assert.throws(function () {
                    hub.create([], object);
                });

                assert.throws(function () {
                    hub.create({}, object);
                });
            });
            it('same ID passed twice', function () {
                var obj = {};
                var id = uuid();
                assert.throws(function () {
                    hub.create(id, obj);
                    hub.create(id, obj);
                });
            });
        });
        it('re-emits same object', function (done) {
            hub.on('create', function (newId, newObject) {
                assert.equal(
                    JSON.stringify(newObject),
                    JSON.stringify(object)
                    );
                assert.equal(newId, id);
                done();
            });
            hub.create(id, object);
        });
    });
    describe('remove', function () {
        describe('throws if ', function () {
            it('ID not passed', function () {
                assert.throws(function () {
                    hub.remove();
                });
            });
            it('passed ID is not a string', function () {
                assert.throws(function () {
                    hub.remove(1);
                });
                assert.throws(function () {
                    hub.remove([]);
                });
                assert.throws(function () {
                    hub.remove({});
                });
            });
            it('passed ID of non existent object', function () {
                assert.throws(function () {
                    hub.remove(id);
                });
            });
        });
        it('re-emits removed ID', function (done) {
            hub.on('remove', function (removedId) {
                assert.equal(removedId, id);
                done();
            });
            hub.create(id, object);
            hub.remove(id);
        });
    });
    describe('update', function () {
        describe('throws if ', function () {
            it('ID not passed', function () {
                assert.throws(function () {
                    hub.update();
                });
            });
            it('passed ID is not a string', function () {
                assert.throws(function () {
                    hub.update(1);
                });
                assert.throws(function () {
                    hub.update([]);
                });
                assert.throws(function () {
                    hub.update({});
                });
            });
            it('passed ID of non existent object', function () {
                assert.throws(function () {
                    hub.update(id);
                });
            });
            it('Object not passed', function () {
                assert.throws(function () {
                    hub.create(id, object);
                    hub.update(id);
                });
            });
        });
        it('re-emits updated object and ID', function (done) {
            var oldObject = 'Old';
            var newObject = 'New';
            hub.on('update', function (updatedId, updatedObject) {
                assert.equal(updatedObject, newObject);
                assert.equal(updatedId, id);
                done();
            });
            hub.create(id, oldObject);
            hub.update(id, newObject);
        });
    });
    describe('constructor', function () {
        it('throws if not a hash given', function () {
            var c;
            assert.throws(function () {
                c = new Hub('');
            });
            assert.throws(function () {
                c = new Hub([]);
            });
            assert.throws(function () {
                c = new Hub(1);
            });
        });
        it('throws if called without New', function () {
            assert.throws(function () {
                Hub();
            });
        });

    });
    describe('getState', function () {
        it('returns internal state', function () {
            var hash = {};
            hash[id] = object;
            var hub = new Hub(hash);
            assert.equal(
                JSON.stringify(hub.getState()),
                JSON.stringify(hash)
            );
        });

    });

    describe('chained', function () {
        this.timeout(2000);
        var one;
        var two;
        var three;
        beforeEach(function () {
            one = new Hub();
            two = new Hub();
            three = new Hub();
        });
        it('.connect fires reset event', function (done) {
            two.on('reset', function () {
                done();
            });
            two.connect(one);
        });

        it('.reset fires reset event', function (done) {
            one.on('reset', function () {
                done();
            });
            one.reset();
        });
        it('.reset updates state', function (done) {
            var hash = {};
            hash[id] = object;
            one.on('reset', function (state) {
                assert.equal(JSON.stringify(state), JSON.stringify(hash));
                done();
            });
            one.reset(hash);
        });

        describe('instance propagate initial state', function () {
            it('downwards', function () {
                one = new Hub(object);
                two = new Hub();
                three = new Hub();
                two.connect(one);
                three.connect(two);
                assert.equal(
                    JSON.stringify(three.getState()),
                    JSON.stringify(object)
                );
            });

            it('but not upwards', function () {
                one = new Hub();
                two = new Hub();
                three = new Hub(object);
                two.connect(one);
                three.connect(two);

                assert.notEqual(
                    JSON.stringify(three.getState()),
                    JSON.stringify(object)
                );
                assert.notEqual(
                    JSON.stringify(one.getState()),
                    JSON.stringify(object)
                );
            });
        });

        describe('Method calls propogate through the chain', function () {
            describe('create', function () {
                it('forward',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        three.on('create', function () {
                            done();
                        });
                        one.create(id, object);
                    }
                );
                it('backwards',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        one.on('create', function () {
                            done();
                        });
                        three.create(id, object);
                    }
                );
                it('to both forks upstream and downstream simultaneously',
                    function (done) {

                        //calls callback after being called given times.
                        var counter = (function (callback, times) {
                            var i = 0;
                            return function () {
                                i++;
                                if (times === i) {
                                    callback();
                                }
                            };
                        })(done, 2);

                        two.connect(one);
                        three.connect(two);
                        one.on('create', function () {
                            counter();
                        });
                        three.on('create', function () {
                            counter();
                        });
                        two.create(id, object);
                    }
                );
            });
            describe('remove', function () {
                it('forward',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        three.on('remove', function () {
                            done();
                        });
                        one.create(id, object);
                        one.remove(id);
                    }
                );
                it('backwards',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        one.on('remove', function () {
                            done();
                        });
                        three.create(id, object);
                        three.remove(id);
                    }
                );
                it('to both forks upstream and downstream simultaneously',
                    function (done) {

                        //calls callback after being called given times.
                        var counter = (function (callback, times) {
                            var i = 0;
                            return function () {
                                i++;
                                if (times === i) {
                                    callback();
                                }
                            };
                        })(done, 2);

                        two.connect(one);
                        three.connect(two);
                        one.on('remove', function () {
                            counter();
                        });
                        three.on('remove', function () {
                            counter();
                        });
                        two.create(id, object);
                        two.remove(id);
                    }
                );
            });
            describe('update', function () {
                it('forward',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        three.on('update', function () {
                            done();
                        });
                        one.create(id, object);
                        one.update(id, object2);
                    }
                );
                it('backwards',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        one.on('update', function () {
                            done();
                        });
                        three.create(id, object);
                        three.update(id, object2);
                    }
                );
                it('to both forks upstream and downstream simultaneously',
                    function (done) {

                        //calls callback after being called given times.
                        var counter = (function (callback, times) {
                            var i = 0;
                            return function () {
                                i++;
                                if (times === i) {
                                    callback();
                                }
                            };
                        })(done, 2);

                        two.connect(one);
                        three.connect(two);
                        one.on('update', function () {
                            counter();
                        });
                        three.on('update', function () {
                            counter();
                        });
                        two.create(id, object);
                        two.update(id, object2);
                    }
                );
            });
            describe('reset', function () {
                it('forward',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        three.on('reset', function () {
                            done();
                        });
                        one.reset();
                    }
                );
                it('backwards',
                    function (done) {
                        two.connect(one);
                        three.connect(two);
                        one.on('reset', function () {
                            done();
                        });
                        three.reset();
                    }
                );
                it('to both forks upstream and downstream simultaneously',
                    function (done) {

                        //calls callback after being called given times.
                        var counter = (function (callback, times) {
                            var i = 0;
                            return function () {
                                i++;
                                if (times === i) {
                                    callback();
                                }
                            };
                        })(done, 2);

                        two.connect(one);
                        three.connect(two);
                        one.on('reset', function () {
                            counter();
                        });
                        three.on('reset', function () {
                            counter();
                        });
                        two.reset();
                    }
                );
            });
        });


    });
});