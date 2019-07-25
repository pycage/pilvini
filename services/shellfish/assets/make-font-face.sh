#! /bin/bash

FONT=`cat "$1" | base64 -w0`
NAME=`basename "$1" .ttf`
echo "
@font-face {
    font-family: ${NAME};
    src: url(data:font/truetype;charset=utf-8;base64,${FONT}) format('truetype');
    font-weight: normal;
    font-style: normal;
}
"
