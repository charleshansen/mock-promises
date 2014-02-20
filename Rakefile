require 'jasmine'
load 'jasmine/tasks/jasmine.rake'

task :mocha do
  sh 'mocha-server spec/javascripts/mocha_examples_spec.js -r lib/mock-promises.js spec/javascripts/support/expect.js'
end
