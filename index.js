const express = require("express");
const app = express();
const compression = require("compression");
const bodyParser = require("body-parser");
const db = require("./db/db.js");
const bcrypt = require("./db/bcrypt.js");
const csurf = require("csurf");
const cookieSession = require("cookie-session");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("./public"));

app.use(compression());

if (process.env.NODE_ENV != "production") {
    app.use(
        "/bundle.js",
        require("http-proxy-middleware")({
            target: "http://localhost:8081/"
        })
    );
} else {
    app.use("/bundle.js", (req, res) => res.sendFile(`${__dirname}/bundle.js`));
}

app.use(
    cookieSession({
        secret: `I am alway hungry`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(csurf());

app.use(function(req, res, next) {
    res.cookie("mytoken", req.csrfToken());
    next();
});

app.post("/registration", (req, res) => {
    //we will use the body parser to get the values of the form of the body
    if (
        req.body.firstname == "" ||
        req.body.lastname == "" ||
        req.body.email == "" ||
        req.body.hashedpassword == ""
    ) {
        res.json({ success: false }); // if the user has one empty field, we redirect user to register page
    } else {
        //first we have to do is hashing the password of the user
        //we access the hashPassword function from bscrypt file and we use .then since the function was promisified in bsrypt.js
        bcrypt
            .hashPassword(req.body.hashedpassword)
            .then(hashedPassword => {
                // we create here the hashedpassword value in order to receive the returned value of the function hashPassword
                db
                    .createUser(
                        req.body.firstname,
                        req.body.lastname,
                        req.body.email,
                        hashedPassword
                    )
                    .then(results => {
                        //before sending the user to homepage, we want to create a session in order to encrypt the user's data because these data will be available on the client side, which is not safe.
                        /*req.session.userId = results.id;
                        req.session.firstname = req.body.firstname;
                        req.session.lastname = req.body.lastname;
                        req.session.email = req.body.email;
                        req.session.hashedPassword = hashedPassword;
                        req.session.loggedIn = true;*/
                        res.json({ success: true });
                        //res.redirect("/");
                    });
            })
            .catch(err => {
                console.log(err);
            });
    }
});

app.post("/login", (req, res) => {
    console.log("loginstart", req.body);
    //var userInfo; //We create this variable in order to link it with the variable results in our getEmail function.
    //we will use the body parser to get the values of the form of the body
    if (req.body.email == "" || req.body.password == "") {
        console.log("allfieldserror");
        res.json({
            error: true,
            message: "all fields are required!"
        });
        return; // if the user has one empty field, we redirect user to register page
    }

    db.getEmail(req.body.email).then(results => {
        //remember: the result is ALWAYS an array!
        if (results.length == 0) {
            res.json({
                error: true,
                message: "email does not exist"
            });
        } else {
            //userInfo = results[0];
            //const hashedPwd = userInfo.hashed_password; //result is an array and hashed password is the fifth element of this array
            bcrypt
                .checkPassword(req.body.password, results[0].hashed_password)
                .then(checked => {
                    if (checked) {
                        console.log(checked);
                        /*req.session.userId = userInfo.id;
                            req.session.firstname = userInfo.first_name;
                            req.session.lastname = userInfo.last_name;
                            req.session.email = userInfo.email;
                            req.session.hashedPassword = hashedPwd;
                            req.session.loggedIn = true;*/
                        res.json({ success: true });
                    } else {
                        res.json({
                            error: true,
                            message: "password does not exist!"
                        });
                    }
                });
        }
    });
});

//this shit here should be always last: just do it!
app.get("*", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.listen(8080, function() {
    console.log("I'm listening.");
});
