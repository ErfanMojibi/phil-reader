#!/bin/sh
# Give every CSS/JS link a new ?v= number so browsers load fresh files after a
# deploy instead of mixing old cached code with new content. Run before committing.
cd "$(dirname "$0")/.." || exit 1
v=$(date +%Y%m%d%H%M)
sed -i -E "s#(css/style\.css|js/[a-z]+\.js|\./[a-z]+\.js)(\?v=[0-9]+)?#\1?v=$v#g" index.html read.html js/*.js
echo "version $v"
