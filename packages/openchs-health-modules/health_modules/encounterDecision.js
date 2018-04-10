import {malariaPrescriptionMessage} from "./outpatient/malariaMedication";
import FormElementsStatusHelper from "./rules/FormElementsStatusHelper";
import OPDFormHandler from "./outpatient/OPDFormHandler";
import RuleCondition from "./rules/RuleCondition";
import C from './common';

const _ = require("lodash");

const treatmentByComplaintAndCode = {
    "Headache": {
        "X1": {
            "3": [
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X2": {
            "3": [
                {
                    "Medicine": "Paracetamol Syrup",
                    "Dose Unit": "Spoon",
                    "Amount": 1,
                    "Times": 3
                }]
        },
        "X3": {
            "3": [
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 1.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X4": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X5": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }]
        },
        "X6": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X7": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }]
        }
    },
    "Chloroquine Resistant Malaria": {
        "X1": {
            "3": [
                {
                    "Medicine": "Lonart Forte",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X2": {
            "3": [
                {
                    "Medicine": "Lonart Forte",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X3": {
            "3": [
                {
                    "Medicine": "Lonart Forte",
                    "Amount": 1.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X4": {
            "3": [
                {
                    "Medicine": "Lonart Forte",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
    },
    "Cold": {
        "X1": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.25,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X2": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X3": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X4": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X5": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                }
            ]
        },
        "X6": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                }
            ]
        },
        "X7": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                }
            ]
        }
    },
    "Cough": {
        "X1": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X2": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X3": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X4": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    },
    "Cifran-Special": {
        "X1": {
            "1-5": [
                {
                    "Medicine": "Cifran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X2": {
            "1-5": [
                {
                    "Medicine": "Cifran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X3": {
            "1-5": [
                {
                    "Medicine": "Cifran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X4": {
            "1-5": [
                {
                    "Medicine": "Cifran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "1-5": [
                {
                    "Medicine": "Cifran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "1-5": [
                {
                    "Medicine": "Cifran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1-5": [
                {
                    "Medicine": "Cifran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    },
    "Diarrhoea": {
        "X1": {
            "3": [
                {
                    "Medicine": "Furoxone Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                },
                {
                    "Medicine": "Abdek Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X2": {
            "3": [
                {
                    "Medicine": "Furoxone Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon Syrup",
                    "Times": 3
                },
                {
                    "Medicine": "Abdek Syrup",
                    "Dose Unit": "Spoon",
                    "Amount": 1,
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X3": {
            "3": [
                {
                    "Medicine": "Furoxone Syrup",
                    "Amount": 2,
                    "Dose Unit": "Spoon",
                    "Times": 3
                },
                {
                    "Medicine": "Abdek Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X4": {
            "3": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "BC",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X5": {
            "3": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 3
                },
                {
                    "Medicine": "BC",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 3
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X6": {
            "3": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "BC",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X7": {
            "3": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                },
                {
                    "Medicine": "BC",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        }
    },
    "Vomiting": {
        "X1": {
            "3": [
                {
                    "Medicine": "Ondensetran Syrup",
                    "Amount": 1,
                    "Dose Unit": "ml",
                    "Times": "2"
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X2": {
            "3": [
                {
                    "Medicine": "Ondensetran Syrup",
                    "Amount": 2,
                    "Dose Unit": "ml",
                    "Times": "2"
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X3": {
            "3": [
                {
                    "Medicine": "Onden Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X4": {
            "3": [
                {
                    "Medicine": "Onden Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X5": {
            "3": [
                {
                    "Medicine": "Perinorm",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X6": {
            "3": [
                {
                    "Medicine": "Perinorm",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X7": {
            "3": [
                {
                    "Medicine": "Perinorm",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }
            ]
        }
    },
    "Abdominal pain": {
        "X1": {
            "2": [
                {
                    "Medicine": "Cyclopam Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "3"
                }
            ]
        },
        "X2": {
            "2": [
                {
                    "Medicine": "Cyclopam Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "3"
                }
            ]
        },
        "X3": {
            "2": [
                {
                    "Medicine": "Cyclopam Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "3"
                }
            ]
        },
        "X4": {
            "2": [
                {
                    "Medicine": "Cyclopam",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "2": [
                {
                    "Medicine": "Cyclopam",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "3"
                }
            ]
        },
        "X6": {
            "2": [
                {
                    "Medicine": "Cyclopam",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "2": [
                {
                    "Medicine": "Cyclopam",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "3"
                }
            ]
        }
    },
    "Acidity": {
        "X4": {
            "1-5": [
                {
                    "Medicine": "Famotidine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "1"
                }
            ]
        },
        "X5": {
            "1-5": [
                {
                    "Medicine": "Famotidine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "1-5": [
                {
                    "Medicine": "Famotidine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1-5": [
                {
                    "Medicine": "Famotidine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    },
    "Boils": {
        "X1": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X2": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X3": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X4": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    },
    "Scabies": {
        "X1": {
            "3": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.25,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Scabizol",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X2": {
            "3": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Scabizol",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X3": {
            "3": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Scabizol",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X4": {
            "3": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Scabizol",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X5": {
            "3": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Scabizol",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X6": {
            "3": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Scabizol",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X7": {
            "3": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Scabizol",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        }
    },
    "Ring Worm": {
        "X1": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.25,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Salicylic Acid",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X2": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Salicylic Acid",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X3": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Salicylic Acid",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X4": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Salicylic Acid",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X5": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Salicylic Acid",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X6": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Salicylic Acid",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        },
        "X7": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                },
                {
                    "Medicine": "Salicylic Acid",
                    "Amount": 0,
                    "Dose Unit": "Paste",
                    "Times": "Special Instruction"
                }
            ]
        }
    },
    "Body Ache": {
        "X1": {
            "3": [
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X2": {
            "3": [
                {
                    "Medicine": "Paracetamol Syrup",
                    "Dose Unit": "Spoon",
                    "Amount": 1,
                    "Times": 3
                }]
        },
        "X3": {
            "3": [
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 1.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X4": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X5": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }]
        },
        "X6": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X7": {
            "3": [
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }]
        }
    },
    "Pregnancy": {
        "X1": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Calcium",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X2": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Calcium",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X3": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Calcium",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X4": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Calcium",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X5": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Calcium",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X6": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Calcium",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X7": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Calcium",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        }
    },
    "Wound": {
        "X1": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X2": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X3": {
            "1-5": [
                {
                    "Medicine": "Septran Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X4": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1-5": [
                {
                    "Medicine": "Septran",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    },
    "Giddiness": {
        "X1": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X2": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X3": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X4": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X5": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X6": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        },
        "X7": {
            "1-30": [
                {
                    "Medicine": "Iron Folic Acid",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "ORS",
                    "Amount": 0,
                    "Dose Unit": "Powder",
                    "Times": "Special Instruction"
                }]
        }
    },
};

const weightRangesToCode = [
    {start: 3.0, end: 5.5, code: "X1"},
    {start: 5.6, end: 8.0, code: "X2"},
    {start: 8.1, end: 13.0, code: "X3"},
    {start: 13.1, end: 16.0, code: "X4"},
    {start: 16.1, end: 25.5, code: "X5"},
    {start: 25.6, end: 32.5, code: "X6"},
    {start: 32.6, end: 1000, code: "X7"}
];

const weightRangesToCodeForLonartForte = [
    {start: 3.0, end: 4.9, code: "X0"},
    {start: 5.0, end: 14.9, code: "X1"},
    {start: 15, end: 24.9, code: "X2"},
    {start: 25, end: 34.9, code: "X3"},
    {start: 35, end: 1000, code: "X4"},
];

const complaintToWeightRangesToCodeMap = {
    "Chloroquine Resistant Malaria": weightRangesToCodeForLonartForte
};

const englishWordsToMarathi = {
    "Chloroquin": "क्लोरोक्विन",
    "Chloroquin Syrup": "क्लोरोक्विन सायरप",
    "Paracetamol Syrup": "पॅरासिटामॉल सायरप",
    "Paracetamol": "पॅरासिटामॉल",
    "Spoon": "चमचा",
    "Tablet": "टॅबलेट",
    "Cetrizine": "सेट्रीझीन",
    "Cetrizine Syrup": "सेट्रीझीन सायरप",
    "Furoxone Syrup": "फ्युरोक्सोन सायरप",
    "Furoxone": "फ्युरोक्सोन",
    "Abdek": "अबडक",
    "Abdek Syrup": "अबडक सायरप",
    "BC": "बीसी",
    "Perinorm": "पेरीनॉर्म",
    "Ondensetran Syrup": "ऑन्डेन सायरप",
    "Cyclopam Syrup": "सायरप सायक्लोपाम",
    "Cyclopam": "सायक्लोपाम",
    "Famotidine": "फॅमोटिडीन",
    "Septran Syrup": "सायरप सेप्ट्रान",
    "Septran": "सेप्ट्रान",
    "Scabizol": "खरुजेचे औषध",
    "Salicylic Acid": "सॅलिसिलिक ऍसिड",
    "Iron Folic Acid": "आयरन",
    "Calcium": "कॅल्शियम",
    "Lonart Forte": "लोनर्ट फोर्टे",
    "Onden Syrup": "सायरप ओंडेन",
    "Cifran": "सिफ्रान",
    "Before": "जेवणाआधी",
    "After": "जेवणानंतर",
    "": "",
    "ORS": "ORS"
};

const dayInMarathi = {
    "1": "पहिल्या दिवशी",
    "2": "दुसऱ्या दिवशी",
    "3": "तिसऱ्या दिवशी"
};

const medicines = {
    "Abdek Syrup": {take: ""},
    "BC": {take: ""},
    "Calcium": {take: "Before"},
    "Cetrizine": {take: "After"},
    "Cetrizine Syrup": {take: "After"},
    "Cifran": {take: "After"},
    "Chloroquin": {take: "After"},
    "Chloroquin Syrup": {take: "After"},
    "Cyclopam": {take: "After"},
    "Cyclopam Syrup": {take: "After"},
    "Famotidine": {take: "Before"},
    "Furoxone": {take: ""},
    "Furoxone Syrup": {take: ""},
    "Iron Folic Acid": {take: "After"},
    "Ondensetran Syrup": {take: "Before"},
    "Onden Syrup": {take: "Before"},
    "ORS": {take: ""},
    "Paracetamol": {take: "After"},
    "Paracetamol Syrup": {take: "After"},
    "Perinorm": {take: "Before"},
    "Lonart Forte": {take: "After"},
    "Salicylic Acid": {take: ""},
    "Scabizol": {take: ""},
    "Septran": {take: "After"},
    "Septran Syrup": {take: "After"}
};

const doseQuantityToMarathi = function (doseQuantity, doseUnit) {
    if (doseQuantity === 0.25) return "१/४";
    if (doseQuantity === 0.5 && doseUnit === "Spoon") return "अर्धा";
    if (doseQuantity === 0.5 && doseUnit === "Tablet") return "अर्धी";
    if (doseQuantity === 1) return "१";
    if (doseQuantity === 1.5) return "दीड";
    if (doseQuantity === 2) return "२";
    if (doseQuantity === 3) return "३";
    if (doseQuantity === 4) return "४";
    console.error("Dose quantity - " + doseQuantity + " for dose unit - " + doseUnit + " is not supported");
};

const dosageTimingToMarathi = function (complaint, times) {
    if (times === 1 || times === "1") return "दिवसातून एकदा";
    if (times === 2 || times === "2") return "दिवसातून दोन वेळा";
    if (times === 3 || times === "3") return "दिवसातून तीन वेळा";
    if (times === "Once Evening") return "रोज संध्याकाळी एकदा";
    if (times === "Special Instruction" && complaint === "Scabies") return "मानेपासून संपूर्ण अंगास अंघोळीनंतर लावणे व कपडे १ तास गरम पाण्यात उकळवीणे";
    if (times === "Special Instruction" && complaint === "Ring Worm") return "गजकर्णाच्या जागेवर लावण्यास सांगावे";
    if (times === "Special Instruction" && (complaint === "Vomiting" || complaint === "Diarrhoea" || complaint === "Giddiness")) return " पिण्यास सांगावे";
    console.error("Number of times " + times + " not supported yet");
};

const getDoseUnitMessage = function (daysPrescription) {
    if (daysPrescription["Dose Unit"] === "Spoon")
        return daysPrescription.Amount < 2 ? "चमचा" : "चमचे";
    else if (daysPrescription["Dose Unit"] === "ml")
        return "ml";
    return "टॅबलेट";
};

const getKeys = function (obj) {
    var keys = [];
    for (var key in obj) {
        keys.push(key);
    }
    return keys;
};

const getWeightRangeToCode = function (complaint, weight) {
    var weightRangeToCodeMap = complaintToWeightRangesToCodeMap[complaint];
    if (_.isNil(weightRangeToCodeMap))
        weightRangeToCodeMap = weightRangesToCode;

    return weightRangeToCodeMap.find(function (entry) {
        return entry.start <= weight && entry.end >= weight;
    });
};

const hasMalaria = function (encounter) {
    return new RuleCondition({programEncounter: encounter})
        .valueInEncounter("Paracheck")
        .containsAnyAnswerConceptName("Positive for PF", "Positive for PF and PV", "Positive for PV")
        .matches();
};

const notEmpty = (decision) => 
    !_.some([decision, decision.name, decision.value], C.isEmptyOrBlank);

const getDecisions = function (encounter) {
    if (encounter.encounterType.name !== "Outpatient") return {};

    var {complaints, sex, age, weight, height} = getParameters(encounter);

    if (complaints.indexOf("Fever") === -1 && hasMalaria(encounter)) {
        complaints.push("Fever");
    }
    complaints = complaints.filter(function (item) {
        return item === 'Fever';
    }).concat(complaints.filter(function (item) {
        return item !== 'Fever'
    }));

    var potentiallyPregnant = (sex === "Female" && (age >= 16 && age <= 40));
    var decisions = [];
    var prescribedMedicines = [];

    var decision = {name: "Treatment Advice", value: '', abnormal: true};

    for (var complaintIndex = 0; complaintIndex < complaints.length; complaintIndex++) {
        var weightRangeToCode = getWeightRangeToCode(complaints[complaintIndex], weight);
        decision.code = weightRangeToCode.code;

        var prescriptionSet;
        if (potentiallyPregnant && ["Cough", "Boils", "Wound"].indexOf(complaints[complaintIndex]) !== -1) {
            prescriptionSet = treatmentByComplaintAndCode["Cifran-Special"];
        } else if (complaints.indexOf("Fever") === -1) {
            prescriptionSet = treatmentByComplaintAndCode[complaints[complaintIndex]];
        }

        var message = "";
        if (prescriptionSet) {
            var prescription = prescriptionSet[weightRangeToCode.code];
            if (prescription === null || prescription === undefined) {
                throw "No prescription defined for " + complaints[complaintIndex] + " for weight: " + weight + ", calculated code: " + weightRangeToCode.code;
            }

            var dayTokens = getKeys(prescription);
            for (var token = 0; token < dayTokens.length; token++) {
                var firstToken = dayTokens[0];

                var daywisePrescription = dayTokens.length !== 1 && firstToken === "1";
                if (daywisePrescription) {
                    message += dayInMarathi[dayTokens[token]];
                    message += "\n";
                }

                for (var medicineIndex = 0; medicineIndex < prescription[dayTokens[token]].length; medicineIndex++) {
                    var daysPrescription = prescription[dayTokens[token]][medicineIndex];
                    if (prescribedMedicines.indexOf(daysPrescription.Medicine) === -1) {
                        prescribedMedicines.push(daysPrescription.Medicine);
                    } else if (prescribedMedicines.indexOf(daysPrescription.Medicine) !== -1 && !daywisePrescription) {
                        continue;
                    }

                    if (dayTokens.length === 1 && firstToken !== "1") {
                        if (firstToken === "3-5")
                            message += "३ किंवा ५ दिवसांसाठी";
                        else if (firstToken === "1-5")
                            message += "१ ते ५ दिवस";
                        else if (firstToken === "3")
                            message += "३ दिवस";
                        else if (firstToken === "2")
                            message += "२ दिवस";

                        message += "\n";
                    }

                    message += englishWordsToMarathi["" + daysPrescription.Medicine];
                    message += " ";
                    if (daysPrescription.Times !== "Special Instruction") {
                        message += doseQuantityToMarathi(daysPrescription.Amount, daysPrescription["Dose Unit"]);
                        message += " ";
                        message += getDoseUnitMessage(daysPrescription);
                        message += " ";
                    }
                    message += dosageTimingToMarathi(complaints[complaintIndex], daysPrescription.Times);
                    message += " ";
                    message += englishWordsToMarathi[medicines[daysPrescription.Medicine].take];
                    message += "\n";
                }
            }
        }

        decision.value = decision.value === '' ? message : `${decision.value}\n${message}`;

        if (complaints[complaintIndex] === "Fever") {
            decision.value = `${decision.value}\n${malariaPrescriptionMessage(encounter)}`;
        }

        if (weight >= 13 && complaints[complaintIndex] === "Fever") {
            if (decision.value.indexOf("क्लोरोक्विन") !== -1 && decision.value.indexOf("पॅरासिटामॉल") !== -1) {
                decision.value = `${decision.value}\nक्लोरोक्विन व पॅरासिटामॉल ही औषधे जेवल्यावर खायला सांगावी`;
            } else if (decision.value.indexOf("पॅरासिटामॉल") !== -1) {
                decision.value = `${decision.value}\nपॅरासिटामॉल ही औषध जेवल्यावर खायला सांगावी`;
            }
        }
        else if (complaints[complaintIndex] === 'Vomiting') {
            decision.value = `${decision.value}\nउलटी असल्यास आधी औषध द्यावे व अर्ध्या तासांनंतर जेवण, दुध द्यावे व अर्ध्या तासांनंतर इतर औषधे द्यावीत`;
        }
        else if (complaints[complaintIndex] === 'Chloroquine Resistant Malaria' && (age >= 16 || age <= 40) && sex === "Female") {
            decision.value = decision.value.replace(message, '');
        } else if (complaints[complaintIndex] === 'Wound') {
            decision.value = `${decision.value}\nड्रेसिंग`;
        }
    }

    decisions.push(decision);

    if (_.isNumber(height) && _.isNumber(weight))
        decisions.push({name: "BMI", value: C.calculateBMI(weight, height)});

    decisions = decisions.filter(notEmpty);
    return {encounterDecisions: decisions};
};


function getParameters(encounter) {
    const params = {};
    params.complaints = encounter.findObservation('Complaint').getReadableValue();
    params.age = encounter.individual.getAgeInYears();
    params.sex = encounter.individual.gender.name;
    params.weight = encounter.getObservationValue('Weight');
    params.height = encounter.getObservationValue('Height');
    return params;
}

const validate = function (encounter, form) {
    if (encounter.encounterType.name !== "Outpatient") return [];

    const params = getParameters(encounter);
    const validationResults = [];

    for (var complaintIndex = 0; complaintIndex < params.complaints.length; complaintIndex++) {
        const complaint = params.complaints[complaintIndex];
        const weightRangeToCode = getWeightRangeToCode(complaint, params.weight);

        if (params.sex === 'Male' && complaint === 'Pregnancy') {
            addValidationError("maleCannotBePregnant");
        }
        if (complaint === 'Pregnancy' && params.age < 10) {
            addValidationError("lessThanTenCannotBePregnant");
        }
        if (weightRangeToCode.code === "X0" || (complaint === 'Acidity' && params.weight < 13)) {
            addValidationError("lonartNotToBeGivenToChildren");
        }
    }

    function addValidationError(messageKey) {
        validationResults.push({success: false, messageKey: messageKey});
    }

    return validationResults;
};

const getFormElementsStatuses = (encounter, formElementGroup) => {
    let handler = new OPDFormHandler();
    return FormElementsStatusHelper.getFormElementsStatuses(handler, encounter, formElementGroup);
};

export {
    getDecisions,
    treatmentByComplaintAndCode,
    weightRangesToCode,
    getFormElementsStatuses,
    validate
};
