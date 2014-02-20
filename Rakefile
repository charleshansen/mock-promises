require 'jasmine'
load 'jasmine/tasks/jasmine.rake'

task :mocha do
  # ==requires==
  # $brew install node
  # npm install
  # export PATH=$PATH:/usr/local/share/npm/bin
  sh 'mocha-server spec/javascripts/mocha_examples_test.js -r lib/mock-promises.js spec/javascripts/support/expect.js'
end
