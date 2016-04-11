if [ ! -d /usr/local/opt/android-sdk/build-tools/23.0.3 ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter build-tools-23.0.3;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi


if [ ! -d /usr/local/opt/android-sdk/build-tools/23.0.1 ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter build-tools-23.0.1;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi
