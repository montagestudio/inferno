var express = require('express');

var redis = require('redis');
var redisClient = redis.createClient();
var RedisStore = require('connect-redis')(express);

var fs = require("fs");
var Q = require("q");
var Trello = require("node-trello");
var OAuth = require("oauth").OAuth;
var url = require("url");

var app = express();
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

app.use(express.logger('dev'));
app.use(express.cookieParser("ok ok ok goooooo"));
app.use(express.session({ store: new RedisStore }));

var config;
var domain = "127.0.0.1";
var port = 3000;
var oauth;
var appName = "inferno";

var requestURL = "https://trello.com/1/OAuthGetRequestToken",
    accessURL = "https://trello.com/1/OAuthGetAccessToken",
    authorizeURL = "https://trello.com/1/OAuthAuthorizeToken";

fs.readFile("config.json", function (err, data) {

    if (err) {
        throw err;
    }

    console.log("Loaded configuration");
    config = JSON.parse(data);

    domain = (config.domain || domain);
    port = (config.port || port);

    var loginCallback = "http://" + domain + ":" + port + "/session/authorized";

    oauth = new OAuth(requestURL, accessURL, config.trello.key, config.trello.secret, "1.0", loginCallback, "HMAC-SHA1");

    app.listen(port);
    console.log("Listening on port", port);
});

app.use(function (req, res, next) {
    var pathName = url.parse(req.url).pathname;

    if ("/login" === pathName || "/session/authorized" === pathName ||
        (req.session && req.session.accessToken)) {

        next();
    } else {
        req.session.returnUrl = req.url;
        res.redirect("/login");
    }
});

app.get("/login", function (req, res) {
    res.render("session/new");
});

app.post("/login", function (req, res) {
    oauth.getOAuthRequestToken(function (error, token, tokenSecret, results) {
        redisClient.set(token, tokenSecret);
        res.writeHead(302, { 'Location': authorizeURL+ "?oauth_token=" + token + "&name=" + appName });
        res.end();
    });
});

app.get("/session/authorized", function (req, res) {
    var query = url.parse(req.url, true).query;

    var token = query.oauth_token,
        verifier = query.oauth_verifier;

    redisClient.get(token, function (err, reply) {
        var tokenSecret = reply.toString(),
            afterLoginUrl = "/";

        oauth.getOAuthAccessToken(token, tokenSecret, verifier, function(error, accessToken, accessTokenSecret, results) {
            req.session.accessToken = accessToken;
            redisClient.set(accessToken, accessTokenSecret);

            if (req.session.returnUrl) {
                afterLoginUrl = req.session.returnUrl;
                req.session.returnUrl = null;
            }
            res.redirect(afterLoginUrl);
        });
    });
});

app.post("/logout", function (req, res) {
    req.session = null;
    redisClient.set(token, null);
    res.render("session/destroy");
});

app.get('/', function (req, res) {

    var trello = new Trello(config.trello.key, req.session.accessToken),
        fullName,
        boardEntries,
        boards;

      trello.get("/1/members/me", function(err, data) {

          if (err) {
              throw err;
          }

          if ("expired token\n" == data) {
               res.render("expired");
          } else {

              fullName = data.fullName;

              boardEntries = data.idBoards.map(function (boardId) {
                  return {id: boardId, url: "/1/boards/" + boardId};
              });

              Q.all(boardEntries.map(function(board) {
                  return Q.ninvoke(trello, "get", board.url);
              })).then(function (boards) {
                  console.log(boards)
                  res.render('index', {
                      locals: {
                          name: fullName,
                          boards: boards
                      }
                  });
              }).done();
          }
      });
});

app.get('/boards/:boardId', function(req, res) {
        var boardId = req.params["boardId"];
        var trello = new Trello(config.trello.key, req.session.accessToken);

        Q.ninvoke(trello, "get", "/1/boards/" + boardId).then(function (board) {
            res.render('boards/detail', {
                  locals: {
                      board: board
                  }
              });
        }).done();
});

app.get('/boards/:boardId/burndown', function(req, res) {
        var boardId = req.params["boardId"];
        var trello = new Trello(config.trello.key, req.session.accessToken);
        var board;

        Q.ninvoke(trello, "get", "/1/boards/" + boardId).then(function (boardResponse) {
            board = boardResponse;
        }).then(function() {
            return Q.ninvoke(trello, "get", "/1/boards/" + boardId + "/cards").then(function (cards) {

                cards = cards.map(function(card) {
                    card.name.match(/^\s*\((\d+)\)/);
                    if (!RegExp.$1) {
                        card.points = null;
                    } else {
                        card.points = parseInt(RegExp.$1, 10);
                        card.name = card.name.replace(/^\s*\(\d+\)\s*/, "");
                    }

                    return card;
                });

                res.render('boards/burndown', {
                    locals: {
                        board: board,
                        cards: cards
                    }
                });
            });
        }).done();
});

app.post("/boards/:boardId/burndown", function (req, res) {
    console.log(req.body);
});