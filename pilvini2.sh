#! /bin/sh

CWD=`dirname $0`
SHELLFISH="${CWD}/../shellfish/dist"
#SHELLFISH="${CWD}/shellfish"
node "${SHELLFISH}/shellfish-node.js" \
     "${SHELLFISH}/require2.js" \
     "${SHELLFISH}/shellfish.pkg" \
     "${SHELLFISH}/shellfish-server.pkg" \
     "${CWD}/server/main.shui"
