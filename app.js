/*

   thread - chrome extension

   TODO:

   * canvas_frame removal - more cleanup for body selector
   * incorporate handlebars for easier templating
   * gmail selectors for from, date, content body, etc
   * figure out how to scan a message body for dates
   * better load_complete support for gmail (everything is async)
   * try and get messageid from within gmail

*/

// --- Configuration
var options = {
  name: 'thread-chrome',
  development: false,
  logLevel: 'debug',
  cssLink: 'styles/thread.css',
  apiHost: 'http://thread-rails.herokuapp.com'
};

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
  this._level = options.level || 'INFO';

};

Logger.prototype.name = function() {
  return this._name;
};

Logger.prototype.level = function() {
  return this._level;
};

Logger.prototype._print = function(level, msg) {
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
};

Logger.prototype.info   = function(msg) { this._print('INFO',   msg); };
Logger.prototype.debug  = function(msg) { this._print('DEBUG',  msg); };
Logger.prototype.trace  = function(msg) { this._print('TRACE',  msg); };
Logger.prototype.notice = function(msg) { this._print('NOTICE', msg); };
Logger.prototype.warn   = function(msg) { this._print('WARN',   msg); };
Logger.prototype.error  = function(msg) { this._print('ERROR',  msg); };

var Gmail = function() {
  this.inboxLink = null;
  this.inConversationView = false;
  this._eventQueues = {};
  
  if (!$) 
    throw new Error('Zepto must be initialized first');

};

Gmail.prototype.threadId = function() {
  var location = String(document.location);
  return location.substr(location.lastIndexOf('/') + 1);
};

Gmail.prototype.threadSubject = function() {
  return this._canvas()
    .find('.hP')
    //.filter(':visible') XXX need to build the selector module in zepto
    .text();
};

Gmail.prototype.isThread = function() {
  return (this.threadId() !== '#inbox');
};

Gmail.prototype._originalUrl = function(id) {
  //XXX make sure we return the right URL
  // is http vs https, apps domain, etc
  return 'https://mail.google.com/mail/u/0/?ui=2&ik=50e71a47f3&view=om&th=' + id;
};

Gmail.prototype.loadOriginal = function(id, callback) {
  if (typeof(id) !== 'string') 
    throw new TypeError('id (string) is required');

  $.get(this._originalUrl(id), function(data) {
    log.debug('original email [' + id + '] loaded');
    return callback(data);
  });
};


Gmail.prototype.createThread = function(callback) {
  // just posts the threadID to the appropriate API endpoint

  if (!this.isThread()) 
    if (callback) return callback(false);

  var thread = {
    user_email: this.emailAddress(),
    subject: this.threadSubject(),
    thread_uid: this.threadId()
  };

  $.post(options.apiHost + '/api/threads/chrome.json', {thread:thread}, function(data) {
    log.info('created thread');
    if (callback)
      return callback(null);
  });

};


Gmail.prototype.postOriginal = function(id, callback) {
  if (typeof(id) !== 'string') 
    throw new TypeError('id (string) is required');

  this.loadOriginal(id, function(email) {
    var encoded = window.btoa(email);
    log.debug('encoded result length: ' + encoded.length);
    var result = { base64: encoded };

    // Should probably be replaced with 
    // some kind of API Client function
    // client.createThread(data, callback);
    // client.updateEvent(id, data, callback);
    // client.deleteEvent(id, callback);
    // client.getEvent(id, callback);

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

};

Gmail.prototype.logo = function() {
  return this._canvas.find('[role=banner]');
};

Gmail.prototype.insertCss = function() {
  // do something
};

Gmail.prototype.currentView = function() {
  if ($('h1.ha').length > 0) {
    return 'conversation';
  } else {
    return 'thread';
  }
};

Gmail.prototype.banner = function() {
  return $(['role=banner']);
};

Gmail.prototype.emailAddress = function() {

  //['#guser nobr b','#gbmpc','.gbpc','#gbg6','#gbg4']

  var e = undefined;
  $('.gbpc .gbps2, #gbg6, #gbg4', this._canvas()).each(function(i, elements) {
    console.log($(elements).text());
    e = $(elements).text();
    if (e !== undefined) {
      return false;
    }
  });

  return e; //document.title.split(/ - /)[1];
};

Gmail.prototype.numUnread = function() {
  var title, num;

  title = this.inboxUrl().title;
  num = /\((\d+)\)/.exec(title);
  return (num && num[1]) ? parseInt(num[1]) : 0;
};

Gmail.prototype._canvas = function() {
  //return $(document.getElementById('canvas_frame').contentDocument)
  return $('body');
};

Gmail.prototype._body = function() {
  return $('body');
  /*
  return this._canvas()
           .find('body')
           .first();
  */
};

Gmail.prototype.inboxUrl = function() {
  var element, body, inbox;
  
  body= this._body();
  element = body.find('a[href$="#inbox"][title^="Inbox"]');

  if (element.length > 0)
    inbox = element.first()[0];
 
  return inbox;

};

Gmail.prototype.messageBody = function(index) {
  var messages, body;
  
  messages = gmail._body().find('.ii.gt.adP');

  if (!index) var index = messages.length - 1;

  if (messages.length > 0) {
    body = $(messages[index])
      .find('div')
      .first();
  }

  return body;
};

Gmail.prototype.messageBodyText = function(index) {
  var body = this.messageBody(index);
  if (body)
    return body.text();
};

Gmail.prototype.messageBodyHtml = function(index) {
  var body = this.messageBody(index);
  if (body)
    return body.html();
};

Gmail.prototype.addActionButton = function(label, options) {

  if (typeof(label) !== 'string')
    throw new TypeError('label (string) is required');

  var defaultOptions = {
    index: 0,
    tooltip: label,
    style: "-webkit-user-select: none;"
  };

  if (!options)
    options = defaultOptions;

  //XXX iterate through defaultoptions and apply to options Obj

  var label = label;

  var toInject = 
    '<div class="G-Ni J-J5-Ji thread-button">' +
    '<div class="T-I J-J5-Ji lS T-I-ax7 ar7" thread-action="' + options.index + '"' +
    ' role="button" tabindex="0" style="' + options.style + '"' + 
    ' aria-label="' + label + '" data-tooltip="' + options.tooltip + '">' +
    '<div class="asa"><span class="Ykrj7h">' + label + '</span>' +
    '<div class="T-I-J3 J-J5-Ji"></div></div></div>';

  $('.iH')
    .children()
    .first()
    .append(toInject);

  // XXX this wont work with more than one button (well)
  return $('.iH')
    .find('.thread-button');

};


Gmail.prototype.on = function(event, callback) {
  if (!this._eventQueues[event])
    this._eventQueues[event] = [];
  
  this._eventQueues[event].push(callback);
};

Gmail.prototype._event = function() {
  var name, args;

  if (arguments.length == 0) 
    throw new Error('name (string) must be provided');

  name = arguments[0];
  
  if (arguments.length > 1) 
    args = Array.prototype.slice.call(arguments, 1);

  for (var i in this._eventQueues[name]) {
    var next = this._eventQueues[name][i];
    next.apply(this, args);
  }
};

Gmail.prototype.bindDOM = function() {
  var self = this;
  log.trace('binding to DOMSubtreeModified');

  this._canvas().bind('DOMSubtreeModified', function(element) {
    // view change event handling
    if (self._canvas().find('.ha').length > 0) {
      if (self.inConversationView === false) {
        self.inConversationView = true;
        self._event('viewchange', 'conversation');
      }
    } else {
      if (self.inConversationView === true) {
        self.inConversationView = false;
        self._event('viewchange', 'thread');
      }
    }


  });
};

Gmail.prototype._hideNotification = function() {
  $('.UD').attr('style', '');
  $('.UB').attr('style', '');
  $('.vh').attr('style', '');
};

Gmail.prototype.notify = function(message, timeout) {
  var self = this;

  if (!message)
    throw new TypeError('message (string) is required');

  if (!timeout)
    timeout = 5000; // before we hide the notification item

  this._canvas()
    .find('.vh')
    .html(message);

  $('.UD').css('visibility', 'visible');
  $('.UB').css('visibility', 'visible');
  $('.vh').css('visibility', 'visible');

  setTimeout(function() { self._hideNotification(); }, timeout);

};

Gmail.prototype.insertCss = function(csslink) {
  var css = $('<link rel="stylesheet" type="text/css">');
  css.attr('href', csslink);
  this._canvas()
    .find('head').first()
    .append(css);
};

Gmail.prototype.addDeveloperToolbar = function() {
  log.info('adding dev toolbar');
  var self = this;

  var template = 
    [ '<div id="ebb">'
    , '  <span><b>ebb</b></span>'
    , '  <span id="actions">'
    , '    <button id="submit">postOriginal</button>'
    , '    <button id="debug">debug</button>'
    , '    <button id="create_event">CREATE EVENT</button>'
    , '  </span>'
    , '</div'
    ].join('\n');


  var clickButton = function(selector, action) {
    self._body().find(selector).on('click', action);
  };

  this._body().prepend(template);

  clickButton('#ebb #actions #submit', function() {
    id = gmail.threadId();
    self.postOriginal(id);
  });
 
  clickButton('#ebb #actions #create_event', function() {
    self.createThread();
  });

  clickButton('#ebb #actions #submit', function() {
    id = gmail.threadId();
    self.postOriginal(id);
  });

  clickButton('#ebb #actions #debug', function() {
    log.debug('printing debug output');
    console.log('-------------------------------------------------');
    console.log('emailAddress: ' + self.emailAddress());
    console.log('numUnread: ' + self.numUnread());
    console.log('inboxUrl: ' + self.inboxUrl());
    console.log('threadId: ' + self.threadId());
    console.log('threadSubject: ' + self.threadSubject());
    console.log('-------------------------------------------------');
  });

};

/*
// --- JSON Client
// just messin' around.

var Client = function(options) {
  if (typeof(options) !== 'object') 
    throw new TypeError ('options (object) is required');

  this._url = options.url;
  this._pretty = options.pretty || false;
  this._timeout = options.timeout || 0;
  this._contentType = 'application/json';
  this._acceptsType = 'json'; // json, jsonp, xml, html or text

  this.contentWriters = {
    'application/json': function(v) {
      if (this.pretty) {
        return JSON.stringify(v, null, 2);
      } else {
        return JSON.stringify(v);
      }
    }
  }

}

Client.prototype._request = function(method, path, data, callback) {
  var self = this;
  var ajaxOptions = {
    type: 'GET', 
    url: urlWithParams,
    data: data,
    contentType: self._contentType,
    dataType: self._acceptsType,
    timeout: self._timeout,
    headers: {},
    async: true,
    global: true,
    //content: window
  }

  ajaxOptions.success = function(data) {
    return callback(null, data);
  }

  ajaxOptions.error = function(xhr, type) {
    return callback(xhr, type);
  }

  $.ajax(ajaxOptions)

}

Client.prototype.serialize = function(data) {
  return this.contentWriters[this._contentType](data);
}

Client.prototype.get = function(path, callback) {
  this._request('GET', path, null, function(err, req, res, robj) {
    return callback(err, req, res); 
  });
}

Client.prototype.post = function(path, obj, callback) {
  this._request('POST', path, obj, function(err, req, res, robj) {
    return callback(err, req, res, robj);
  });
}

Client.prototype.put = function(path, obj, callback) {
  this._request('PUT', path, obj, function(err, req, res, robj) {
    return callback(err, req, res, robj);
  });
}

Client.prototype.del = function(path, callback) {
  this._request('DELETE', path, null, function(err, req, res, robj) {
    return callback(err, req, res); 
  });
}

*/

// ----------------------------------------------------
// Main
// ----------------------------------------------------

var log = new Logger({name: options.name, level: options.logLevel});
var gmail = new Gmail();

log.info('loaded');

var main = function() {
  gmail.insertCss(options.cssFile);
  if (options.development) {
    gmail.addDeveloperToolbar();
  }

  gmail.on('viewchange', function(view) {
    log.debug('view changed to: ' + view);
    if (view === 'conversation') {
      var button = gmail.addActionButton('Thread');

      button.on('click', function() {
        log.trace('\'Thread\' button clicked!');
        //gmail.postOriginal(gmail.threadId());
        gmail.createThread();
        gmail.notify('Created a new Thread');
      });

    }
  });

  gmail.bindDOM();

};

Zepto(function($) {
  log.info('zepto loaded');
  setTimeout(main, 3000); //XXX this needs to be more elegant
});
