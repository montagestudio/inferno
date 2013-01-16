Inferno
=======

A burndown chart generator for Trello

Installation
============
Relies on redis (install somewhere)
```
curl -O http://download.redis.io/redis-stable.tar.gz
tar -xvzf redis-stable.tar.gz
rm redis-stable.tar.gz
cd redis-stable
make
sudo make install
```

Create a ```config.json``` at the root of the inferno application:

```javascript
{
    "trello": {
        "key": "KEY_GOES_HERE",
        "secret": "SECRET_HERE"
    },
    "sessionSecret": "SESSION_SECRET_HERE"
}
```
[Trello Key Information](https://trello.com/1/appKey/generate)

To run
======
```
redis-server
node app.js
```