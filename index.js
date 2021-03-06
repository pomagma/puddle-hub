/** @module puddle-hub */
'use strict';

var _ = require('lodash');
var Debug = require('debug');
var debug = Debug('puddle:hub');
var assert = require('assert');
var uuid = require('node-uuid');

var stateValidate = function (state) {
    var hash;
    if (state === undefined) {
        hash = {};
    } else {
        hash = state;
    }
    assert(_.isObject(hash), 'Hash must be an object');
    assert(!_.isArray(hash), 'Hash must not be an Array');
    return hash;
};


/**
 * This is a HUB object
 * @constructor */
module.exports = function (initState) {
    assert(this, 'Constructor can\'t be called without New');
    var hash = stateValidate(initState);
    this.nodeId = uuid();

    var events = {};
    this.on = function (event, callback, otherNodeId) {
        //otherNodeId is MANDATORY for internal functinos.
        //It is used by .emit function to filter events by origin
        //If not set will fire anyway. That is what we need for 'normal' api.
        //All internal functions MUST provide otherNodeId to prevent event storm

        debug('listener', event, 'bound to', this.nodeId,
            'with otherID', otherNodeId);
        assert(_.isFunction(callback));
        if (events[event] === undefined) {
            events[event] = [];
        }
        events[event].push({id: otherNodeId, callback: callback});
    };
    var emit = _.bind(function () {
        //last parameter of any .emit must be ignored nodeId.
        //ignored nodeId will not be fired
        var args = _.toArray(arguments);
        var event = args.shift();
        var ignoredId = args.pop();
        args.push(this.nodeId);
        debug('on', event, 'event by', this.nodeId, 'ignoring', ignoredId);

        var listeners = events[event];
        _.each(listeners, function (listener) {
            if (ignoredId !== listener.id) {
                var cb = listener.callback;
                debug('on', event, 'listener fired by', this.nodeId,
                    'ignore', ignoredId, 'listener', listener.id);
                cb.apply(cb, args);
            }
        },this);

    }, this);

    /**
     * Connect
     * @param {object} otherHub Other HUB instance to bind to.
     */
    this.connect = function (otherHub) {
        debug('.connect ->', this.nodeId);
        //reset our own data before connect;
        hash = otherHub.getState();

        //bind all methods together
        ['create', 'remove', 'update', 'reset'].forEach(function (method) {
            otherHub.on(
                method,
                _.bind(this[method], this),
                this.nodeId
            );
            this.on(
                method,
                _.bind(otherHub[method], otherHub),
                otherHub.nodeId
            );
        }, this);
        emit('reset', hash, otherHub.nodeId);
    };
    /**
     * Reset
     * @param {hash} state The state to init with. {id1:obj1,id2:obj2, ...}
     * @param {string} [nodeId] Id of the node to ignore on emit
     */
    this.reset = function (state, nodeId) {
        debug('.reset ->', this.nodeId, 'ignore', nodeId);
        hash = stateValidate(state);
        emit('reset', this.getState(), nodeId || this.nodeId);
    };

    /**
     * Create
     * @param {string} id Unique ID generated by uuid.
     * @param {object} obj Object to be synced, can be anything [],{},''
     * @param {string} [nodeId] Id of the node to ignore on emit
     */
    this.create = function (id, obj, nodeId) {
        debug('.create ->', this.nodeId, 'ignore', nodeId);
        assert(_.isString(id), 'Id must be a string');
        assert(obj, 'Object must be set');
        assert(!hash[id], 'Id has to be unique ' + this.nodeId);

        hash[id] = _.cloneDeep(obj);
        emit('create', id, _.cloneDeep(obj), nodeId || this.nodeId);
    };
    /**
     * Remove
     * @param {string} id Id of already existing object
     * @param {string} [nodeId] Id of the node to ignore on emit
     */
    this.remove = function (id, nodeId) {
        debug('.remove ->', this.nodeId, 'ignore', nodeId);
        assert(_.isString(id), 'Id must be a string');
        assert(hash[id], 'Id has to exists ' + this.nodeId);

        delete hash[id];
        emit('remove', id, nodeId || this.nodeId);

    };
    /**
     * Update
     * @param {string} id ID of already existing object.
     * @param {object} obj Object to be updated, can be anything [],{},''
     * @param {string} [nodeId] Id of the node to ignore on emit
     */
    this.update = function (id, obj, nodeId) {
        debug('.update ->', this.nodeId);
        assert(_.isString(id), 'Id must be a string');
        assert(obj, 'Object must be set');
        assert(hash[id], 'Id has to exists ' + this.nodeId);

        hash[id] = _.cloneDeep(obj);
        emit('update', id, _.cloneDeep(obj), nodeId || this.nodeId);
    };

    /**
     * getState
     * @returns {Object} deep copy of internal state object
     */
    this.getState = function () {
        debug('.getState ->', this.nodeId);
        return _.cloneDeep(hash);
    };

};
