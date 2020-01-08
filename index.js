const express = require('express');
const buildUrl = require('build-url');
const sessions = require('client-sessions');
const rp = require('request-promise');

const app = express();

const authServer = 'http://localhost:8080';
const clientId = 'test';
const myUrl = 'http://localhost:3000';
const state = 'xyz';
const redirectUri = `${myUrl}/authorize_cb`;


app.set('view engine', 'pug');
app.set('views', './views');

app.use(sessions({
  cookieName: 'session',
  secret: 'sdlkfjsldkfjlskdjflksdjf',
  duration: 24* 60 * 60* 1000,
  activeDuration: 1000 * 60 * 5
}));

app.get('/authorize', (req, res) => {
  res.redirect(buildUrl(authServer, {
    path: 'authorize',
    queryParams: {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state
    }
  }));
});

app.get('/authorize_cb', (req, res, next) => {
  if (req.query.error) {
    return res.render('error', { error: req.query.error });
  }
  if (req.query.state !== state) {
    return res.render('error', { error: 'state mismatch' });
  }
  if (!req.query.code) {
    return res.render('error', { error: 'need a code...' });
  }
  console.log('ill go login for this user now using the auth code:', req.query.code);

  rp({
    uri: `${authServer}/token`,
    method: 'POST',
    form: {
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: redirectUri,
      client_id: clientId
    },
    auth: {
      username: 'test',
      password: 'Password1!'
    },
    json: true
  }).then((response) => {
    req.session.auth = response;
    const redirectTo = req.session.redirectTo || '/';
    delete req.session.redirectTo;
    res.redirect(redirectTo);
  }).catch(next);


});

app.use((req, res, next) => {
  if (!req.session.auth) {
    req.session.redirectTo = req.url;
    return res.redirect('/authorize');
  }
  next();
});

app.get('/', (req, res) => {
  res.render('index', { user: req.session.auth.user.fullname });
});

app.listen(3000, () => {
  console.log(`listening on port 3000`);
});