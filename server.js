const express = require('express')
const app = express()
const ejs = require('ejs')
const path = require('path')
const expressLayout = require('express-ejs-layouts')
const session = require('express-session')
const flash = require('express-flash')
const passport = require('passport')
const bcrypt = require('bcrypt')
const MongoDbStore = require('connect-mongo')(session)
const react = require('react')
const mongoose = require('mongoose')
const url = 'mongodb+srv://abc:123@cluster1.tqgye.mongodb.net/pizza?retryWrites=true&w=majority'
mongoose.connect(url, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: true });
const connection = mongoose.connection;
connection.once('open', () => {
    console.log('Database connected...')
}).catch(err => {
    console.log('Connection failed...')
});

let mongoStore = new MongoDbStore({
    mongooseConnection: connection,
    collection: 'sessions'
})

app.use(session({
    secret: 'iqwlroanreolw',
    resave: false,
    store: mongoStore,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}))

const passportInit = require('./app/config/passport')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }))
app.use(express.json())


app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})

app.use(expressLayout)
app.set('views', path.join(__dirname, '/resources/views'))
app.set('view engine', 'ejs')

const Menu = require('./app/models/menu')
app.get('/', function (req, res) {
    Menu.find().then(function (pizzas) {
        res.render('home', { pizzas: pizzas })
    })

})

function guest (req, res, next) {
    if(!req.isAuthenticated()) {
        return next()
    }
    return res.redirect('/')
}


app.get('/login', guest, function (req, res) {
    res.render('auth/login');
})

app.post('/login', function(req,res,next){
    passport.authenticate('local', (err, user, info) => {
        if(err) {
            req.flash('error', info.message )
            return next(err)
        }
        if(!user) {
            req.flash('error', info.message )
            return res.redirect('/login')
        }
        req.logIn(user, (err) => {
            if(err) {
                req.flash('error', info.message ) 
                return next(err)
            }

            return res.redirect("./")
        })
    })(req, res, next)

})

app.get('/register', guest, function (req, res) {
    res.render('auth/register');
})

const User = require('./app/models/user')
app.post('/register', async function (req, res) {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
        req.flash('error', 'All fields are required')
        req.flash('name', name)
        req.flash('email', email)
        res.redirect('/register')
    }
    User.exists({ email: email }, (err, result) => {
        if (result) {
            req.flash('error', 'Email already taken')
            req.flash('name', name)
            req.flash('email', email)
            return res.redirect('/register')
        }
    })

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
        name,
        email,
        password: hashedPassword
    })

    user.save().then((user) => {
        res.redirect('/')
     }).catch(err => {
        req.flash('error', 'Something went wrong')
            res.redirect('/register')
     })
})

app.post('/logout', function(req, res){
    req.logout()
    res.redirect('/login')
})

app.get('/cart', function (req, res) {
    res.render('customers/cart');
})

app.post('/update-cart', function (req, res) {
    if (!req.session.cart) {
        req.session.cart = {
            items: {},
            totalQty: 0,
            totalPrice: 0
        }
    }
    let cart = req.session.cart
    if (!cart.items[req.body._id]) {
        cart.items[req.body._id] = {
            item: req.body,
            qty: 1
        }
        cart.totalQty = cart.totalQty + 1
        cart.totalPrice = cart.totalPrice + req.body.price
    } else {
        cart.items[req.body._id].qty = cart.items[req.body._id].qty + 1
        cart.totalQty = cart.totalQty + 1
        cart.totalPrice = cart.totalPrice + req.body.price
    }
    res.json({ totalQty: req.session.cart.totalQty })
})

const Order = require('./app/models/order')
app.post('/orders',function(req,res){
    const { phone, address} = req.body
    if(!phone || !address) {
        req.flash('error','All fields are required')
        res.redirect('/cart');
    }

    const order = new Order({
        customerId: req.user._id,
        items: req.session.cart.items,
        phone,
        address
    })

    order.save().then((result)=>{
        req.flash('success','Order placed successfully')
        delete req.session.cart
        res.redirect('/')
    }).catch(err =>{
        req.flash('error','Something went wrong')
        res.redirect('/cart')
    })
})

app.get('/feedback', function (req, res)
{
    res.sendFile(path.join(__dirname, '/resources/views/feedback.html'));
});

const Feed = require('./app/models/feedback')
app.post('/feedback',function(req,res){
    const {name, email, rating} = req.body
    if (!name || !email || !rating) {
        console.log('All fields are required')
        res.redirect('/feedback')
    }
    
    Feed.exists({ email: email }, (err, result) => {
        if (result) {
            console.log('Email already taken')
            return res.redirect('/feedback')
        }
    })

    const feed = new Feed({
        name,
        email,
        rating
    })
    feed.save().then((feed) => {
        res.redirect('/')
     })
})

app.listen(3000, () => {
    console.log('Listening on port 3000')
})