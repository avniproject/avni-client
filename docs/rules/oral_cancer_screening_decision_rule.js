({params, imports}) => {
  const TAG = '[OralScreening]';
  const encounter = params.entity;
  const moment = imports.moment;
  const decisions = params.decisions;
  const enrolmentDecisions = [];
  const encounterDecisions = [];
  const registrationDecisions = [];

  const hasAnyHabitHistoryQuestionAnsweredAsCurrentOrPast = new imports.rulesConfig.RuleCondition({encounter}).when.valueInEncounter("9c605412-2664-4957-b40f-f9a49d560c65")
    .containsAnyAnswerConceptName("96872a13-2367-45e4-bf5d-959ba37405cc","d2ae1999-5594-4096-8c49-e86c0a5f890e")
    .or.when.valueInEncounter("ce70e55e-125f-47e6-b9da-c3b946e3f51e").containsAnyAnswerConceptName("96872a13-2367-45e4-bf5d-959ba37405cc","d2ae1999-5594-4096-8c49-e86c0a5f890e")
    .or.when.valueInEncounter("76b9246f-a500-456f-a5da-0f098cc58b1e").containsAnyAnswerConceptName("96872a13-2367-45e4-bf5d-959ba37405cc","d2ae1999-5594-4096-8c49-e86c0a5f890e")
    .or.when.valueInEncounter("fca4d070-c113-4d16-abf7-a544ad6bbeb8").containsAnyAnswerConceptName("96872a13-2367-45e4-bf5d-959ba37405cc","d2ae1999-5594-4096-8c49-e86c0a5f890e").matches();

  console.log(TAG, 'habit-history high-risk =', hasAnyHabitHistoryQuestionAnsweredAsCurrentOrPast);

  if(hasAnyHabitHistoryQuestionAnsweredAsCurrentOrPast){
    encounterDecisions.push({name: "Risk Factor", value: ["High Risk"]});
    registrationDecisions.push({name: "Risk Factor", value: ["High Risk"]});
  }
  else {
    registrationDecisions.push({name: "Risk Factor", value: []});
  }

  decisions.enrolmentDecisions.push(...enrolmentDecisions);
  decisions.encounterDecisions.push(...encounterDecisions);
  decisions.registrationDecisions.push(...registrationDecisions);

  const questionGroup = encounter.getObservationValue('Oral Image and Diagnosis');
  console.log(TAG, "questionGroup present =", !!questionGroup, "length =", questionGroup ? questionGroup.length : 0);

  if(questionGroup && questionGroup.length > 0) {
    const firstQuestionGroup = questionGroup[0];
    let imageUriObs = firstQuestionGroup.findObservationByConceptUUID('Oral Image');  // stored filename/URI
    console.log(TAG, "image observation present =", !!imageUriObs);

    if(imageUriObs) {
      const imageUri = imageUriObs.getValue();
      const imagePath = params.services.mediaService.getAbsolutePath(imageUri, 'Image');
      console.log(TAG, "imageUri =", imageUri, "imagePath =", imagePath);

      // 3-fold MViT2 cross-validation ensemble (model6/model8/model8-2 -> mvit2_fold1_6/
      // mvit2_fold1_8/mvit2_fold2_8), soft-voted by EdgeModelService.runEnsembleInferenceOnImage
      // per tools/edge-model/README.md's "3-fold ensemble flow". This REPLACES the old single
      // 'mvit2_fold5_2_latest_traced' model call, which is retired and (as of this edit) not even
      // registered in registry.json — that mismatch was the immediate cause of every inference
      // call failing outright.
      const modelKeys = ['mvit2_fold1_6', 'mvit2_fold1_8', 'mvit2_fold2_8'];
      console.log(TAG, `calling edgeModelService.runEnsembleInferenceOnImage([${modelKeys.join(',')}], ...)`);

      // result: { label: "Positive"|"Negative", confidence, positive, modelKeys, perModel }
      // combine/threshold/labels come from the folds' shared registry override
      // (tanuh-ensemble-override.json's output.params) unless overridden here.
      return params.services.edgeModelService.runEnsembleInferenceOnImage(modelKeys, imagePath)
        .then(result => {
          console.log(TAG, "ensemble result:", JSON.stringify({
            label: result.label,
            confidence: result.confidence,
            positive: result.positive,
            perModel: result.perModel
          }));
          // Matches the exact answer-concept strings configured on the Avni server for
          // "AI Oral Screening" (both directly confirmed against your org's config: "Suspicious"
          // and "Non-Suspicious" — note the hyphen in the negative case, which differs from the
          // space used in tools/edge-model/README.md's scheduleImageInferenceIntoGroup example
          // mapping ({'Positive': 'Suspicious', 'Negative': 'Non Suspicious'}) — that README
          // example is illustrative only, this server's actual configured string wins). Avni
          // decision values need to match a configured coded-concept answer exactly (including
          // punctuation), so this replaces the earlier placeholder strings
          // ("Suspected Oral SCC"/"Normal") that didn't correspond to any real answer option.
          const value = result.label === "Positive" ? "Suspicious" : "Non-Suspicious";
          console.log(TAG, "decision:", value);
          decisions.encounterDecisions.push({name: "AI Oral Screening", value});
          return decisions;
        })
        .catch(err => {
          console.error(TAG, "inference failed:", err && err.message ? err.message : err);
          // Don't swallow the rule — push a diagnostic decision so the screen surfaces failure.
          decisions.encounterDecisions.push({name: "AI Oral Screening", value: "Inference Failed"});
          return decisions;
        });
    }
  }
  console.log(TAG, "skipping inference (no image observation)");
  return decisions;
};
