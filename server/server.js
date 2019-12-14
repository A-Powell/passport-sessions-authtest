const express = require('express');
const uuid = require('uuid/v4')
const session = require('express-session')
const FileStore = require('session-file-store')(session); // calling the session variable when we require the FileStore
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const axios = require('axios'); // Helper functions should replace all uses of axios here, axios used for the local db created.
const bcrypt = require('bcrypt-nodejs');

// const users = [
//     {id: '1', email: 'test@test.com', password: 'password'}
// ]

//configure passport.js to use the local strategy(user/email and pass)

// passport.use(new LocalStrategy(
//     { usernameField: 'email'},
//     (email, password, done) => {
//         console.log('Inside local strategy callback')
//         // here is where you make a call to the database
//        // to find the user based on their username or email address
//        // for now, we'll just pretend we found that it was users[0]
//        const user = users[0]
//        if(email === user.email && password === user.password) {
//            console.log('Local strategy returned true')
//            return done(null, user)
//        }
//     }
// ));

passport.use(new LocalStrategy(
    { usernameField: 'email' },
    (email, password, done) => {
      axios.get(`http://localhost:5000/users?email=${email}`)
      .then(res => {
        const user = res.data[0]
        if (!user) {
          return done(null, false, { message: 'Invalid credentials.\n' });
        }
        if (!bcrypt.compareSync(password, user.password)) {
          return done(null, false, { message: 'Invalid credentials.\n' });
        }
        return done(null, user);
      })
      .catch(error => done(error));
    }
  ));

//tell passport how to serialize the user
passport.serializeUser((user, done) => {
    console.log('Inside serializeUser callback. user id is saved to the session file store here')
    done(null, user.id);
});

// passport.deserializeUser((id, done) => {
//     console.log('Inside deserializeUser callback')
//     console.log(`The user id passport saved in the session file store is: ${id}`)
//     const user = users[0].id === id ? users[0] : false;
//     done(null, user);
// });

passport.deserializeUser((id, done) => {
    axios.get(`http://localhost:5000/users/${id}`)
    .then(res => done(null, res.data) )
    .catch(error => done(error, false))
  });


const app = express();

app.use(bodyParser.urlencoded({extended: false})) //frontend to our application, the data in the POST request Content-Type would come through as a ‘application/x-www-form-urlencoded’.
app.use(bodyParser.json())

//add and configure middleware
app.use(session({
    genid: (req) => {
        console.log('Inside the session middleware')
        console.log(`Request object sessionID from client: ${req.sessionID}`)
        return uuid() // use UUIDs for session IDs
    }, // will change later to use connect-pg-simple to store sessions on DB instead of a file locally
    store: new FileStore(), //add an instance to the FileStore to our session configuration.
    secret: 'lambda school', //want to replace this with a randomly generated string that’s pulled from an environment variable.
    resave: false,
    saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

//home page route
app.get('/', (req, res) => {
    console.log('Inside the homepage callback function')
    console.log(req.sessionID)
    //const uniqueId = uuid()
    res.send('You hit the home page!\n')
})

//login get and post routes
app.get('/login', (req, res) => {
    console.log('Inside GET /login callback function')
    console.log(req.sessionID)
    res.send(`You got the login page!\n`)
})

// app.post('/login', (req, res, next) => {
//     console.log('Inside POST /login callback function')
//     passport.authenticate('local', (err, user, info) => {
//         console.log('Inside passport.authenticate() callback');
//         console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
//         console.log(`req.user: ${JSON.stringify(req.user)}`)
//         req.login(user, (err) => {
//             console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
//             console.log(`req.user: ${JSON.stringify(req.user)}`)
//             return res.send('You were authenticated and logged in!\n')
//         })
//     })(req, res, next);
// })

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if(info) {return res.send(info.message)}
      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }
      req.login(user, (err) => {
        if (err) { return next(err); }
        return res.redirect('/authrequired');
      })
    })(req, res, next);
  })

  app.get('/isauthenticated', (req, res) => {
    console.log(req.isAuthenticated())
    if(req.isAuthenticated()) {
      res.send('Authenticated!')
    } else {
      res.send('Log in!')
    }
  })

app.get('/authrequired', (req, res) => {
    console.log('Inside GET /authrequired callback')
    console.log(`User authenticated? ${req.isAuthenticated()}`)
    if(req.isAuthenticated()) {
        res.send('You hit the authentication endpoint\n')
    } else {
        res.redirect('/')
    }
})


app.listen(3000, () => {
    console.log("listening on localhost:3000")
})

/* 
we need to have some way of making sure that we can save our session id even if the server shuts down. 
That’s where the ‘session store’ comes in. 

Normally, your database would act as a session store, but since we’re trying to keep things as simple as possible, let’s just store our session info in text files.
If you go to the express docs(https://github.com/expressjs/session), you will see that there are a number of npm packages that are provided to act as the glue between your database and the session middleware. 
We’re going to use the one called ‘session-file-store.’ As usual, let’s install it.
*/



/* added "dev:server": "nodemon --ignore sessions/ server.js" to scripts in package.json
to ignore sessions folder created (npm run dev:server to start server) */



/* 
At the top of the file we are requiring passport and the passport-local strategy.

Going down to the middle of the file, we can see that we configure our application to use passport as a middleware with the calls to app.use(passport.initialize()) and app.use(passport.session()). Note, that we call this after we configure our app to use express-session and the session-file-store. This is because passport rides on top of these.

Going further down, we see our app.post(‘login’) method immediately calls passport.authenticate() with the local strategy.

The local strategy is configured at the top of the file with passport.use(new LocalStrategy()). The local strategy uses a username and password to authenticate a user; however, our application uses an email address instead of a username, so we just alias the username field as ‘email’. Then we tell the local strategy how to find the user in the database. Here, you would normally see something like ‘DB.findById()’ but for now we’re just going to ignore that and assume the correct user is returned to us by calling our users array containing our single user object. Note, the ‘email’ and ‘password’ field passed into the function inside new LocalStrategy() are the email and password that we send to the server with our POST request. If the data we receive from the POST request matches the data we find in our database, we call the done(error object, user object) method and pass in null and the user object returned from the database. (We will make sure to handle cases where the credential don’t match shortly.)

After the done() method is called, we hop into to the passport.authenticate() callback function, where we pass the user object into the req.login() function (remember, the call to passport.authenticate() added the login() function to our request object). The req.login() function handles serializing the user id to the session store and inside our request object and also adds the user object to our request object.
Lastly, we respond to the user and tell them that they’ve been authenticated! */