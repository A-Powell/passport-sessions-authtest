# passport, sessions, auth test

To run the server use `npm run dev:server` (localhost:3000) (/login)(/authrequired)

To start the DB cd into db folder and run `npm run json:server` It will run on localhost:5000 - (/users)(/users/1)

All tests were ran with cURL from the command line. 

cd client - run => `curl http://localhost:3000/login -c cookie-file.txt -H 'Content-Type: application/json' -d '{"email":"test@test.com", "password":"password"}' -L`
To test login.
