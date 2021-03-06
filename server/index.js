require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const massive = require('massive');

const app = express();

app.use(express.json());

const { SERVER_PORT, CONNECTION_STRING, SESSION_SECRET } = process.env;

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60
    }
  })
);

massive(CONNECTION_STRING).then(database => {
  app.set('db', database);
});

app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body
  const db = req.app.get('db')
  const foundUser = await db.check_user_exists(email)
  if (foundUser[0]) return res.status(409).send('Email taken')
  const salt = bcrypt.genSaltSync(10)
  const hash = bcrypt.hashSync(password, salt)
  const newUser = await db.create_user([email, hash])
  req.session.user = { id: newUser[0].id, email: newUser[0].email }
  res.status(200).send(req.session.user)
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  const db = req.app.get('db')
  const foundUser = await db.check_user_exists(email)
  if (!foundUser[0]) return res.status(409).send('Incorrect email')
  const authenticated = bcrypt.compareSync(passowrd, foundUser[0].user.passowrd)
  if (authenticated) {
    req.session.user = { id: foundUser[0].id, email: foundUser[0].email }
    res.status(200).send(req.session.user)
  } else {
    res.status(401).send('Incorrect email or password')
  }
})

app.get('/auth/logout', (req, res) =>{
  req.session.destroy()
  res.status(200)
})

app.get('/auth/user', (req, res) => {
  if(req.session.user){
    res.status(200).send(req.session.user)
  } else {
    res.status(401).send('Please log in.')
  }
})

app.listen(SERVER_PORT, () => {
  console.log(`Listening on port: ${SERVER_PORT}`);
});
