::получаем curpath:
SET thisBatPath=%~dp0
SET thisBatDisk=%thisBatPath:~0,2%

CALL %thisBatPath%\..\set_env.bat

@TITLE contentLoader

@CLS

%thisBatDisk%
CD %thisBatPath%

npm run watch_httpServer
@pause
