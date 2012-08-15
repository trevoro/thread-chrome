/*

   ebb chrome extension

   TODO:

   * incorporate handlebars for easier templating
   * gmail selectors for subject, from, date, content body, etc

*/

// --- Configuration
var options = {
  name: 'ebb',
  development: true,
  logLevel: 'debug',
  apiHost: 'https://localhost:8080'
}

// --- Libraries 

var Logger = function(options) {
  if (typeof(options) !== 'object') 
    throw new TypeError('options (object) is required');
  
  if (!options.name) 
    throw new TypeError('options.name (string) is required');

  var logLevels = [
    'INFO',
    'DEBUG'
  ];

  this._name = options.name;
  this._level = options.level || 'INFO'

}

Logger.prototype.name = function() {
  return this._name;
}

Logger.prototype.level = function() {
  return this._level;
}

Logger.prototype.print = function(level, msg) {
  var toPrint = [
    this._name,
    (new Date).toJSON(),
    '[' + level + ']',
    msg].join(' ');

  switch (level) {
    case 'ERROR':
      console.error(toPrint);
      break;
    case 'WARN':
      console.warn(toPrint);
      break;
    default: 
      console.log(toPrint);
      break;
  }
}

Logger.prototype.info   = function(msg) { this.print('INFO',   msg); }
Logger.prototype.debug  = function(msg) { this.print('DEBUG',  msg); }
Logger.prototype.trace  = function(msg) { this.print('TRACE',  msg); }
Logger.prototype.notice = function(msg) { this.print('NOTICE', msg); }
Logger.prototype.warn   = function(msg) { this.print('WARN',   msg); }
Logger.prototype.error  = function(msg) { this.print('ERROR',  msg); }

var Gmail = function() {
  this._name = 'gmail'; // not necessary

  if (!$) 
    throw new Error('Zepto must be initialized first');
}

Gmail.prototype.threadId = function() {
  var location = String(document.location);
  return location.substr(location.lastIndexOf('/') + 1);
}

Gmail.prototype.threadSubject = function() {
  return 'subject';
}

Gmail.prototype._originalUrl = function(id) {
  //XXX make sure we return the right URL
  // is http vs https, apps domain, etc
  return 'https://mail.google.com/mail/u/0/?ui=2&ik=50e71a47f3&view=om&th=' + id;
}

Gmail.prototype.loadOriginal = function(id, callback) {
  if (typeof(id) !== 'string') 
    throw new TypeError('id (string) is required');

  $.get(this._originalUrl(id), function(data) {
    log.debug('original email [' + id + '] loaded');
    return callback(data);
  });
}

// Should probably be replaced with 
// some kind of API Client function

Gmail.prototype.postOriginal = function(id, callback) {
  if (typeof(id) !== 'string') 
    throw new TypeError('id (string) is required');

  this.loadOriginal(id, function(email) {
    var encoded = window.btoa(email);
    //console.trace('data: ' + data);
    log.debug('encoded result length: ' + encoded.length);
    var result = { base64: encoded }
    log.debug('POST /api/events.json');
    $.post(options.apiHost + '/api/events.json', 
      JSON.stringify({base64: encoded}),
      function(data) {
        log.info('posted data');
        if (callback)
          return callback(null);
      }
    );
    
  });

}

Gmail.prototype.frame = function() {
  var frame, canvas;
  canvas = document.getElementById('canvas_frame');

  if (canvas !== null) {
    frame = (canvas.contentWindow || canvas.contentDocument);
    if (frame.document) 
      frame = frame.docuemnt
  }
  return frame;
}

Gmail.prototype.logo = function() {
  var frame = this.frame();
  return $('[role=banner]', frame);
}

Gmail.prototype.insertCss = function() {
  // do something
}

// --- Helpers
//

var addDeveloperToolbar = function() {
  log.info('adding devlopment toolbar');

  var template = 
    [ '<div id="ebb">'
    , '  <span>ebb</span>'
    , '  <b>status:</b><span id="status">loaded</span>'
    , '  <span id="actions">'
    , '    <button id="submit">postOriginal</button>'
    , '  </span>'
    , '</div'
    ].join('\n');

  $(document.getElementById('canvas_frame').contentDocument)
    .find('body').first()
    .prepend(template);

  $(document.getElementById('canvas_frame').contentDocument)
    .find('body').first()
    .find('#ebb #actions #submit')
    .on('click', function() {
      id = gmail.threadId();
      gmail.postOriginal(id);
    });

}

// ----------------------------------------------------
// Main
// ----------------------------------------------------

var log = new Logger({name: options.name, level: options.logLevel});
var gmail = new Gmail();

log.info('extension loaded');

var main = function() {
  if (options.development) {
    addDeveloperToolbar();
  }

} 

Zepto(function($) {
  log.info('zepto loaded');
  setTimeout(main, 1000); //XXX this needs to be more elegant
});
