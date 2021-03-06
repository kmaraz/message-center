/*jshint strict:false */
'use strict';

// Create a new angular module.
var MessageCenterModule = angular.module('MessageCenterModule', []);

// Define a service to inject.
MessageCenterModule.
  service('messageCenterService', ['$rootScope', '$sce', '$timeout',
    function ($rootScope, $sce, $timeout) {
      return {
        mcMessages: this.mcMessages || [],
        offlistener: this.offlistener || undefined,
        status: {
          unseen: 'unseen',
          shown: 'shown',
          /** @var Odds are that you will show a message and right after that
           * change your route/state. If that happens your message will only be
           * seen for a fraction of a second. To avoid that use the "next"
           * status, that will make the message available to the next page */
          next: 'next',
          /** @var Do not delete this message automatically. */
          permanent: 'permanent'
        },
        add: function (type, message, options) {
          var availableTypes = ['info', 'warning', 'danger', 'success'],
            service = this;
          options = options || {};
          if (availableTypes.indexOf(type) == -1) {
            throw "Invalid message type";
          }
          var messageObject = {
            type: type,
            status: options.status || this.status.unseen,
            processed: false,
            close: function() {
              return service.remove(this);
            }
          };
          messageObject.message = options.html ? $sce.trustAsHtml(message) : message;
          messageObject.html = !!options.html;
          if (angular.isDefined(options.timeout)) {
            messageObject.timer = $timeout(function () {
              messageObject.close();
            }, options.timeout);
          }

          if (angular.isDefined(options.countdown)) {
            messageObject.countdown = options.countdown;
          }

          if(this.mcMessages.length > 0) {
            var a = true
            angular.forEach(this.mcMessages, function(value, key) {
              if(value.type == type) {
                a = false
              }
            })
            if(a) {
              this.mcMessages.push(messageObject);
            }

          }
          else {
            this.mcMessages.push(messageObject);
          }

          return messageObject;
        },
        remove: function (message) {
          var index = this.mcMessages.indexOf(message);
          this.mcMessages.splice(index, 1);
        },
        reset: function () {
          this.mcMessages = [];
        },
        removeShown: function () {
          for (var index = this.mcMessages.length - 1; index >= 0; index--) {
            if (this.mcMessages[index].status == this.status.shown) {
              this.remove(this.mcMessages[index]);
            }
          }
        },
        markShown: function () {
          for (var index = this.mcMessages.length - 1; index >= 0; index--) {
            if (!this.mcMessages[index].processed) {
              if (this.mcMessages[index].status == this.status.unseen) {
                this.mcMessages[index].status = this.status.shown;
                this.mcMessages[index].processed = true;
              }
              else if (this.mcMessages[index].status == this.status.next) {
                this.mcMessages[index].status = this.status.unseen;
              }
            }
          }
        },
        flush: function () {
          $rootScope.mcMessages = this.mcMessages;
        }
      };
    }
  ]);
MessageCenterModule.
  directive('mcMessages', ['$rootScope', 'messageCenterService', function ($rootScope, messageCenterService) {
    /*jshint multistr: true */
    var templateString = '\
    <div id="mc-messages-wrapper">\
      <div class="alert alert-{{ message.type }}" ng-repeat="message in mcMessages">\
        <span ng-switch on="message.html">\
        <span ng-switch-when="true">\
          <span ng-bind-html="message.message"></span>\
        </span>\
        <span ng-switch-default>\
          {{ message.message }} <span ng-show="message.countdown" countdown="message.countdown">1212</span>\
        </span>\
      </div>\
    </div>\
    ';
    return {
      restrict: 'EA',
      template: templateString,
      link: function(scope, element, attrs) {
        // Bind the messages from the service to the root scope.
        messageCenterService.flush();
        var changeReaction = function (event, to, from) {
          // Update 'unseen' messages to be marked as 'shown'.
          messageCenterService.markShown();
          // Remove the messages that have been shown.
          messageCenterService.removeShown();
          $rootScope.mcMessages = messageCenterService.mcMessages;
          messageCenterService.flush();
        };
        if (messageCenterService.offlistener === undefined) {
          messageCenterService.offlistener = $rootScope.$on('$locationChangeSuccess', changeReaction);
        }
      }
    };
  }]);

MessageCenterModule.
  directive('countdown', ['$rootScope', '$timeout', function ($rootScope, $timeout) {
    /*jshint multistr: true */
    var templateString = '\
    <span ng-bind="counter"></span>...\
    ';
    return {
      restrict: 'EA',
      scope: {
        countdown: '='
      },
      template: templateString,
      link: function(scope, element, attrs) {
        scope.counter = angular.copy(scope.countdown);
        var stopped;

        scope.stop = function(){
          $timeout.cancel(stopped);
        }

        scope.start = function() {
          stopped = $timeout(function() {
           console.log(scope.counter);
           scope.counter--;
           scope.start();
          }, 1000);
          if(scope.counter < 0) {
            scope.counter = angular.copy(scope.countdown);
          }
        };
        scope.start();

        scope.$on("$destroy", function( event ) {
          scope.stop();
        });
      }
    };
  }]);
