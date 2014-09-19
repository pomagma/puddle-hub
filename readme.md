[![Build Status](https://travis-ci.org/pomagma/puddle-hub.svg?branch=master)](http://travis-ci.org/pomagma/puddle-hub)
[![NPM Version](https://badge.fury.io/js/puddle-hub.svg)](https://www.npmjs.org/package/puddle-hub)
[![NPM Dependencies](https://david-dm.org/pomagma/puddle-hub.svg)](https://www.npmjs.org/package/puddle-hub)
[![Coverage Status](https://img.shields.io/coveralls/pomagma/puddle-hub.svg)](https://coveralls.io/r/pomagma/puddle-hub?branch=master)
## Puddle-hub

Corpus CRUD API wrapper


###Features:
    [X] Minimum dependencies
    [X] Can be connectd in a branched fashion, can't in circular  
    Returns a `Hub` class which is:    
        [X] has .on method to hook to events
        [X] emits: `create`,`remove`,`update` events
        [X] implements .create,.remove, .update methods
        [X] implements .getState method which returns internal state
        [X] implements .connect method which allows to 
                bi-directionally bind it to another instance of same class.
        [X] Constructor takes optional state
        [X] Object agnostic (does not care what to sync)                         
    
    
###Installation:
    
    npm install puddle-hub
    npm test        # optional
    
###Usage:
#### API        
    .create(id, obj, [nodeId])
    .remove(id, [nodeId])
    .update(id, obj, [nodeId])
    .reset(state, [nodeId])
    .on('create', function(id,obj) {...}, [nodeId])
    .on('remove', function(id) {...}, [nodeId])
    .on('update', function(id,obj) {...}, [nodeId])
    .on('reset', function(state) {...}, [nodeId])
    .connect(hub)  //also fires reset event
    
CRUD API has optional last parameter nodeId which is used for echo prevention. Please see Echo section below.

####Basic usage:    
    
    var Hub = require('puddle-hub');
    var uuid = require('node-uuid');
    var newId = uuid();
    
    var state = {};
    state[uuid()]='Obj1';
    state[uuid()]='Obj2';
    
    var hub = new Hub(state);  //optionaly pass in init state
    
    hub.on('create', function (id,obj) {
        console.log('Create event called with',obj);
    });
    hub.create(newId,'Obj3'); //here an event will fire and you'll see in Console
    // Create event called with Obj3
    
    console.log(hub.getState()); // returns current state of the internal hash including added Obj3 i.e.
    //{ '5e5c22b8-2053-47d4-a9e4-d4edc92337d0': 'Obj1',
    //    'd165ab1e-d2be-4b4b-956e-97db5ad55597': 'Obj2',
    //    '0ac96ebf-1c0b-4b77-8585-8012302aa56e': 'Obj3' }

####Chaining:

    var Hub = require('puddle-hub');
    var uuid = require('node-uuid');
    var state = {};
    state[uuid()]='Obj1';
    state[uuid()]='Obj2';
    
    var one = new Hub(state);  //pass in init state       
    var two = new Hub();
    var three = new Hub();
    
    var obj = {name:'Object'}; //can be anything, i.e. {},[],''
    
    two.connect(one);
    console.log(three.getState()); // {}
    three.connect(two);
    console.log(three.getState()); // because .connect() pulls in other instance's state.
                                   //{ 'bae0cdf5-ddf5-45b4-aa46-babe9424b5e7': 'Obj1',
                                   //    'a45c6c6f-8f5a-4dab-8872-590c363da7cb': 'Obj2' }
    
    
    one.on('create', function (id,obj) {
       console.log('One got an object ',obj);
    });
    three.on('create', function (id,obj) {
       console.log('Three got an object ',obj);
    });
    
    //events propogate through the chain
    one.create(uuid(),obj); // 'Three got an object obj' && 'One got an object obj'
    
    //both ways
    three.create(uuid(),obj);// 'Three got an object obj' && 'One got an object obj'

#### Echo
If you set a listener on hub i.e. :

    var Hub = require(‘puddle-hub’);
    var hub = new Hub();
    hub.on('create',function (id, obj) {
        console.log('Event fired');
    });

and issue an action

    hub.create('1', {}); // Event fired
    
Than two things will happen:

 * that action will propogate through chain of conneted HUBs (perhaps to other machines via socket.io)
 * you will also hear an 'echo' in a form of event fired immediately with object you have just supplied to hub.create.
 
If you want to avoid echo than supply a nodeId as a last parameter to event linteners like that:

    var Hub = require('puddle-hub');
    var uuid = require('node-uuid');
    var hub = new Hub();
    var obj = {};
    
    
    hub.on('create', function (id, obj) {
        console.log('Event fired');
    }, hub.nodeId);
    
    hub.create(uuid(), 'Some other ID'); // Event fired
    
    //two below are the same:
    hub.create(uuid(), obj); // Event NOT fired
    hub.create(uuid(), hub.nodeId); // Event NOT fired
    
        
Please note that both event listener and method invokation has to have that same unique ID.
Internally calling method w/o nodeId is the same as calling it with hub.nodeId 
In other words event is not fired if it was registered with same ID as method was called.
That only affects local 'echo' events. Other hubs will get their event listeners fired anyway.
        
If you have two local consumers of HUB and none of them wants to hear his own method calls but wants to hear others
than best way would be to create second Hub() instance and chain it accordingly.
            

## Contributors

- Fritz Obermeyer <https://github.com/fritzo>
- Yan T. <https://github.com/yangit>

Puddle was factored out of [Pomagma](https://github.com/fritzo/pomagma) in 2014.

## License

Copyright 2013-2014 Fritz Obermeyer.<br/>
Puddle is licensed under the [MIT license](/LICENSE).