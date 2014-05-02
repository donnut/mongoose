var start = require('./common'),
    mongoose = start.mongoose,
    util = require('util'),
    assert = require('assert'),
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    Types = mongoose.Types;

function BaseAppElementSchema() {
  Schema.apply(this, arguments);

  this.add({
    pid: Schema.Types.ObjectId,
    DOMId: String
  });

  this.method({
    getFragments: function() {
      return this.get('DOMId').split('_');
    }
  });
}
util.inherits(BaseAppElementSchema, Schema);

function BaseWidgetSchema() {
  BaseAppElementSchema.apply(this, arguments);

  this.add({
    bid: [{type: Schema.Types.ObjectId, ref: 'AppElement'}],
    chld: []
  });
}
util.inherits(BaseWidgetSchema, BaseAppElementSchema);

function BaseContentSchema() {
  BaseWidgetSchema.apply(this, arguments);

  this.add({
    data: Schema.Types.Mixed
  });

  this.method({
    getKeys: function() {
      return Object.keys(this.get('data'));
    }
  });
}
util.inherits(BaseContentSchema, BaseWidgetSchema);

var AppElementSchema = new BaseAppElementSchema({}, {collection: 'model-discriminator-'+random(), discriminatorKey: '_type'});
var WidgetSchema = new BaseWidgetSchema();//{}, {discriminatorKey: '_type'});
var ContentSchema = new BaseContentSchema();//{}, {discriminatorKey: '_type'});

describe('models of nested schemas', function() {
  var db, AppElement, Widget, Content;

  before(function() {
    db = start();
    AppElement = db.model('AppElement', AppElementSchema);
    Widget = AppElement.discriminator('Widget', WidgetSchema);
    Content = AppElement.discriminator('Content', ContentSchema);
  });

  after(function(done) {
    db.close(done);
  });

  it('create, save and query', function(done) {
    var appel = new AppElement();
    appel.set('pid', Types.ObjectId());
    appel.set('DOMId', 'first_one');
    appel.save(function(err) {

      var widget = new Widget();
      widget.set('pid', Types.ObjectId());
      widget.set('DOMId', 'second_one');
      widget.bid.push(appel._id);
      widget.save(function(err) {

        var content = new Content();
        content.set('pid', Types.ObjectId());
        content.set('DOMId', 'third_one');
        content.bid.push(appel._id);
        content.set('data', {front: true, back: false});
        content.save(function(err) {

          Widget.find({}, function(err, widgets) {
            assert.equal(widgets.length, 1);

            AppElement.find({}, function(err, appels) {
              assert.equal(appels.length, 3);
              assert.deepEqual(appel.getFragments(), ['first', 'one']);
              assert.deepEqual(widget.getFragments(), ['second', 'one']);
              assert.deepEqual(content.getKeys(), ['front',  'back']);
              assert.equal(appel.get('_type'), null);
              assert.equal(widget.get('_type'), 'Widget');
              assert.equal(content.get('_type'), 'Content');
              done();
            });
          });
        });
      });
    });
  });
});
