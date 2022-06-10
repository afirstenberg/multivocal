
const Timing = require('./timing');

const firstLast = [
  {Name: 'First'},
  {Name: 'Last'}
]

class NamedSequence {
  constructor( config ){
    this.config = config || {};
    this.items = [...firstLast];
    this.unnamedCounter = 0;
  }

  forEach( fn ){
    return this.items.forEach( fn );
  }

  map( fn ){
    return this.items.map( fn );
  }

  names(){
    return this.map( item => item.Name )
  }

  get length(){
    return this.items.length;
  }

  indexOf( name ){
    for( let co=0; co<this.items.length; co++ ){
      const item = this.items[co];
      const itemName = item.Name;
      if( itemName === name ){
        return co;
      }
    }
    return -1;
  }

  add( item ){
    // Normalize to an object, if not provided
    if( typeof item !== 'object' || Array.isArray( item ) ){
      item = {
        Data: item
      }
    }

    // Make sure there is a name
    if( !item.Name ){
      item.Name = `Unnamed-${this.unnamedCounter++}`
    }

    // Should contain either a Before or After name, or we will choose a default
    if( !item.Before && !item.After ){
      item.Before = 'Last'
    }

    // Locate the reference item (that we insert before or after)
    let index = -1;
    if( item.After !== 'Last' && item.Before !== 'First' ){
      index = this.indexOf( item.Before || item.After );
    }
    if( item.After && index >= 0 ){
      index++;
    }

    // insert the item
    this.items.splice( index, 0, item );
  }
}
exports.NamedSequence = NamedSequence;


class NamedFunctionSequence extends NamedSequence {
  constructor( config ){
    super( config );
  }

  add( item ){
    if( typeof item === 'function' ){
      item = {
        fn: item
      }
    }
    if( !item.Name && item.fn ){
      item.Name = item.fn.name
    }
    super.add( item );
  }

  async execFunction( env, fn ){
    const val = await fn( env )
    env = typeof val === 'object' ? val : env
    return env
  }

  async execTimedFunction( env, item, fn ){
    const timing = this.config.Timing;
    const name = `${timing}-${item.Name}`
    timing && await Timing.begin( env, name )
    env = await this.execFunction( env, fn )
    timing && await Timing.end( env, name )
    return env
  }

  async execItem( env, item ){
    const timing = this.config.Timing;
    const fn = item.fn;
    if( fn ){
      env = this.execTimedFunction( env, item, fn );
    }
    return env;
  }

  async exec( env ){

    const timing = this.config.Timing;
    timing && await Timing.begin( env, timing );

    for( let co=0; co<this.items.length; co++ ){
      const item = this.items[co];
      env = await this.execItem( env, item );
    }

    timing && await Timing.end( env, timing );

    return env;
  }
}
exports.NamedFunctionSequence = NamedFunctionSequence;