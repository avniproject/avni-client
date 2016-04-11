if [ ! -d /usr/local/opt/android-sdk/platform-tools ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter platform-tools;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi
