const express = require('express');
const app = express();
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const session = require('express-session');
const passport = require('passport');


const initializePassport = require('./passportConfig');

initializePassport(passport);

const PORT = process.env.PORT || 4000;

app.set('view engine', 'ejs'); // set the view engine to ejs
app.use(express.urlencoded({ extended: false }));

app.use(session
({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get('/', (req, res) => {
  res.render('index'); // render the index.ejs file
});

app.get('/users/login',checkAuthenticated,(req, res) => {
    res.render('login'); // render the login.ejs file
 
});

app.get('/users/register',checkAuthenticated, (req, res) => {
    res.render('register'); // render the register.ejs file
});

app.get('/users/dashboard',checkNotAuthenticated, (req, res) => {
    res.render('dashboard', {user:req.user.name}); // render the dashboard.ejs file  
});

app.get('/users/logout',(req, res) => {
    req.logOut(() =>{
    req.flash('success_msg', "You have been logged out");
    res.redirect('/users/login');}
)});

app.post('/users/register',async(req, res) => {
    let { name, email, password, password2 } = req.body;

    console.log({
        name,
        email,
        password,
        password2
    });

    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please enter all fields" });
    }

    if (password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters" });
    }

    if (password !== password2) {
        errors.push({ message: "Passwords do not match" });
    }

    if (errors.length > 0) {
        res.render('register', { errors });
    }else{
        // Form validation has passed
        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`,[email],(err, results) => {
                if (err) {
                    throw err;
                }

                console.log(results.rows);

                if (results.rows.length > 0) {
                    errors.push({ message: "Email already registered" });
                    res.render('register', { errors });
                } else {
                    pool.query(
                        `INSERT INTO users (name, email, password)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`,
                        [name, email, hashedPassword],
                        (err, results) => {
                            if (err) {
                                throw err;
                            }
                            console.log(results.rows);
                            req.flash('success_msg', "You are now registered. Please log in");
                            res.redirect('/users/login');
                        }
                    )
                }
            }
        )
    }
});

app.post('/users/login', passport.authenticate('local', {
    successRedirect: '/users/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/users/dashboard');
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
