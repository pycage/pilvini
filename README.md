# pilvini
## X-Platform Personal Cloud Drive

> [Finnish]<br>
> **-ni** *(poss. suff.)* my ~<br>
> **pilvi** *(n.)* cloud<br>
> **pilvini** my cloud

*pilvini* is a cloud drive service implementing the WebDAV protoctol running on
Node.js. But this is not all: *pilvini* also features a fancy HTML5 web
interface in case you cannot or want not use a WebDAV client.

The purpose of *pilvini* is to make your home filesystem accessible to you worldwide
in a secure way, SSL-encrypted and guarded by authorization.

*pilvini* runs on whatever platform Node.js is running.

## Requirements:

 * Node.js
 * lwip image processing library (optional, if you want to see image thumbnails in the web interface)

## Installation

Put the `pilvini` directory wherever you like and enter the directory.

If you want to enable image thumbnailing in the web interface, run

```
# npm install
```

to install the `lwip` image processing library.

## Configuration

*pilvini* is configured with a JSON file `config.json`. Copy the file
`config.json.example` over to `config.json` and modify it to your needs with a
text editor:

 * `server` This is the server configuration section.
   * `listen` This is the listening interface of the server. In most cases, the
     default value of `0.0.0.0` is just fine.
   * `port` This is the port where the server listens. Note that privileged
     ports (below 1024) are only available if *pilvini* is started as super-user
     (which we do not recommended).
   * `use_ssl` Set this value to `true` to enable SSL secure connections.
     For SSL, you will also have to supply a server certificate.
   * `ssl_certificate` The path to the SSL server certificate if SSL is enabled.
   * `ssl_key` The path to the SSL server private key if SSL is enabled.

 * `users` This is the users configuration section. You can add as much users
   as you like.
   * `name` The login name of the user.
   * `password_hash` A MD5 hash of the user's login password. You can obtain
     one easily with `echo -n "<password>" | md5`, or use an online MD5 hash
     generator, such as [http://www.adamek.biz/md5-generator.php].
   * `home` This is the path that *pilvini* makes accessible.

 * `global` This is the section for global settings.
   * `debug` Set this value to true to enable verbose debug logging.

If you are giving other users access to *pilvini*, you should make sure that
none of them can access its `config.json` file. While the MD5-hashed passwords
cannot be used to reconstruct the password, it is possible to find a matching
string by brute-force or to construct one mathematically!

## Running

Start the server with
```
# node pilvini.js
```
and *pilvini* welcomes you and is ready for incoming connections:
```
                   | Version 0.1.0
   .-------.       |
  ( Pilvini ).--.  | (c) 2017 Martin Grimme
 (  Cloud Drive  ) | https://github.com/pycage/pilvini
  ```````````````  |
Listening....      | Port 7443 (SSL)
```

## Usage

After the *pilvini* server is started, you can use a WebDAV client to connect
to the port you configured and login as the user you configured.

To use the HTML5 web interface, open the `/index.html` document in a web browser
that supports HTML5.
```
https://<address>:<port>/index.html
```
