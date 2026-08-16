#!/bin/sh
# Elastic Beanstalk's nginx proxies to 127.0.0.1:$PORT (8080 by default).
#
# Next's standalone server binds `process.env.HOSTNAME || '0.0.0.0'`, and on
# Amazon Linux the shell exports HOSTNAME as the instance name (ip-10-0-x-x).
# Left alone, the server would bind only that address, nothing would be
# listening on loopback, and every request would come back 502 from nginx.
# Pinning it here is the fix, and it must happen in a shell wrapper because a
# Procfile entry cannot set environment variables.
export HOSTNAME=0.0.0.0

exec node server.js
