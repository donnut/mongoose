var start = require('./common'),
    mongoose = start.mongoose,
    util = require('util'),
    assert = require('assert'),
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    Types = mongoose.Types;

function BaseSchema() {
  Schema.apply(this, arguments);

  this.add({
    name: String
  });

}
util.inherits(BaseSchema, Schema);

function BaseFirstExtendSchema() {
  BaseSchema.apply(this, arguments);

  this.add({
    color: String
  });
}
util.inherits(BaseFirstExtendSchema, BaseSchema);

function BaseSecondExtendSchema() {
  BaseFirstExtendSchema.apply(this, arguments);

  this.add({
    data: Schema.Types.Mixed
  });

}
util.inherits(BaseSecondExtendSchema, BaseFirstExtendSchema);

var BasicSchema = new BaseSchema({}, {collection: 'model-discriminator-'+random(), discriminatorKey: '_type'});
var FirstSchema = new BaseFirstExtendSchema();
var SecondSchema = new BaseSecondExtendSchema();

describe('models of nested schemas', function() {
  var db, Basic, First, Second;

  before(function() {
    db = start();
    Basic = db.model('Basic', BasicSchema);
    First = Basic.discriminator('First', FirstSchema);
    Second = Basic.discriminator('Second', SecondSchema);
  });

  after(function(done) {
    db.close(done);
  });

  it('create, save and query', function(done) {
    var basic = new Basic();
    basic.set('name', 'basic model');
    basic.save(function(err) {

      var first = new First();
      first.set('name', 'first-extend model');
      first.set('color', 'blue');
      first.save(function(err) {

        var second = new Second();
        second.set('name', 'second-extend model');
        second.set('color', 'green');
        second.set('data', {front: true, back: false});
        second.save(function(err) {

          Basic.find({}, function(err, basics) {
            assert.equal(basics.length, 3);

            First.find({}, function(err, firsts) {
              assert.equal(firsts.length, 1);

              Second.find({}, function(err, seconds) {
                assert.equal(seconds.length, 1);

                assert.equal(basics[0].get('_type'), null);
                assert.equal(firsts[0].get('_type'), 'First');
                assert.equal(seconds[0].get('_type'), 'Second');
                done();
              });
            });
          });
        });
      });
    });
  });
});
