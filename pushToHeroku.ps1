heroku container:push web -a backend-lireddit; 
heroku container:release web -a backend-lireddit;
heroku logs -a backend-lireddit;