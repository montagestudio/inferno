Inferno
=======

A burndown chart generator for Trello

Installation
============
Relies on redis (install somewhere)
curl -O http://download.redis.io/redis-stable.tar.gz
tar -xvzf redis-stable.tar.gz
rm redis-stable.tar.gz
cd redis-stable
make
sudo make install

To run
======
redis-server
node app.js