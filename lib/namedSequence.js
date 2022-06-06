
const firstLast = [
  {Name: 'First'},
  {Name: 'Last'}
]

class NamedSequence {
  constructor(){
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
  constructor(){
    super();
  }

  add( item ){
    if( typeof item === 'function' ){
      item = {
        fn: item
      }
    }
    super.add( item );
  }

  async exec( env ){
    for( let co=0; co<this.items.length; co++ ){
      const item = this.items[co];
      const fn = item.fn;
      if( fn ){
        env = await fn( env );
      }
    }
    return env;
  }
}
exports.NamedFunctionSequence = NamedFunctionSequence;