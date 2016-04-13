(do 
  (def endQuiz (ask "Did you enjoy the quiz?" (answers "Yes." "No." "Not Sure.")))
  (ask "Are you ready?" 
       (when 
         (answer "Yes." 
                 (ask "Select age range:" 
                      (when 
                        (answer "< 20" endQuiz)
                        (answer "> 20 & < 40" endQuiz)
                        (answer "> 40" endQuiz)))) 
         (answer "No." endQuiz))))
  