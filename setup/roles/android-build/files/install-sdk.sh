if [ ! -d /usr/local/opt/android-sdk/platforms/android-23 ]; then
  expect -c '
  set timeout -1;
  spawn android update sdk --all --no-ui --filter android-23;
  expect {
      "Do you accept the license" { exp_send "y\r" ; exp_continue }
      eof
  }
  '
fi
