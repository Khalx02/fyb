import { AnalysisResult } from './src/types';

export interface LocalKnowledgeQueryResult {
  isCocoa: boolean;
  objectType: string;
  ripenessLabel: string;
  ripenessScore: number;
  weeksToHarvest: string;
  estimatedAgeWeeks: string;
  bestHarvestWindow: string;
  podYieldEstimate: string;
  characteristics: string;
  harvestRecommendations: string[];
  risks: string[];
  nextSteps: string[];
  gaugeColor: string;
}

export function parseLocalAgronomicQuery(
  text: string = '',
  hasImage: boolean = false,
  categoryFocus: string = 'ripeness'
): LocalKnowledgeQueryResult {
  const query = text.toLowerCase().trim();

  // 1. Black Pod Rot (Phytophthora palmivora / megakarya)
  if (
    query.includes('black pod') ||
    query.includes('phytophthora') ||
    query.includes('black rot') ||
    query.includes('copper') ||
    query.includes('dark patch') ||
    query.includes('necrotic') ||
    (categoryFocus === 'fungal' && (query.includes('spot') || query.includes('rot') || query.includes('black')))
  ) {
    return {
      isCocoa: true,
      objectType: 'Black Pod Rot (Phytophthora)',
      ripenessLabel: 'Black Pod Infection Risk Detected',
      ripenessScore: 25,
      weeksToHarvest: 'Immediate Sanitation Removal',
      estimatedAgeWeeks: '16 - 20 Weeks',
      bestHarvestWindow: 'Do Not Harvest for Market',
      podYieldEstimate: 'Yield Loss Expected (Beans degraded)',
      characteristics:
        'Observed water-soaked lesions rapidly turning dark brown/black with defined borders. Phytophthora sporangia thrive under high humidity and rain splash.',
      harvestRecommendations: [
        'Remove infected pods immediately before white/grey fungal sporangia mature.',
        'Apply copper hydroxide / copper oxychloride fungicide to adjacent tree canopies.',
        'Prune shade tree canopy to maintain 40–50% light penetration and lower relative humidity.',
        'Bury infected pods under 15cm soil outside the farm boundary or burn safely.'
      ],
      risks: [
        'High risk of rapid secondary infection across adjacent cocoa trees within 3-5 meters via rain splash.',
        'Spores can persist on uncollected pod husks and harvest shears.'
      ],
      nextSteps: [
        'Sanitize harvesting shears with 70% isopropyl alcohol after each tree.',
        'Inspect farm block again in 4–5 days for new water-soaked lesions.'
      ],
      gaugeColor: '#EF4444' // Red
    };
  }

  // 2. Frosty Pod Rot (Moniliophthora roreri)
  if (
    query.includes('frosty') ||
    query.includes('monilia') ||
    query.includes('white powder') ||
    query.includes('mycelium') ||
    query.includes('swelling') ||
    query.includes('spore mat')
  ) {
    return {
      isCocoa: true,
      objectType: 'Frosty Pod Rot (Moniliophthora)',
      ripenessLabel: 'Frosty Pod Rot (Moniliophthora roreri)',
      ripenessScore: 18,
      weeksToHarvest: 'Quarantine & Sanitation Pick',
      estimatedAgeWeeks: '12 - 18 Weeks',
      bestHarvestWindow: 'Immediate Sanitation Removal',
      podYieldEstimate: 'Complete Internal Bean Destruction',
      characteristics:
        'Irregular pod swelling or deformation followed by a dense white-to-creamy fungal mycelial mat. Spores become airborne powder when dry.',
      harvestRecommendations: [
        'Perform weekly sanitation picks before white fungal mats produce dusty airborne spores.',
        'Cover harvested diseased pods with leaf litter or soil to prevent windborne spore dissemination.',
        'Never transport infected pods to non-infected farming blocks.'
      ],
      risks: [
        'Can cause up to 80% total crop loss if dusty spores are allowed to airborne spread.',
        'Spores remain viable on branch detritus for several weeks.'
      ],
      nextSteps: [
        'Isolate the infected block and alert surrounding cocoa farmers.',
        'Apply Trichoderma-based bio-fungicides if locally registered.'
      ],
      gaugeColor: '#DC2626'
    };
  }

  // 3. Cocoa Swollen Shoot Virus Disease (CSSVD)
  if (
    query.includes('swollen shoot') ||
    query.includes('cssvd') ||
    query.includes('red vein') ||
    query.includes('mottling') ||
    query.includes('mealybug') ||
    query.includes('virus') ||
    query.includes('stem swelling')
  ) {
    return {
      isCocoa: true,
      objectType: 'Cocoa Swollen Shoot Virus (CSSVD)',
      ripenessLabel: 'Viral Swollen Shoot Symptoms',
      ripenessScore: 30,
      weeksToHarvest: 'Monitor Tree Lifespan',
      estimatedAgeWeeks: 'Perennial Canopy',
      bestHarvestWindow: 'Harvest Remaining Mature Pods',
      podYieldEstimate: 'Progressive Yield Decline (30-60% loss)',
      characteristics:
        'Red vein-banding chlorosis on young leaves, interveinal leaf mottling, and characteristic swelling of orthotropic stems and chupons.',
      harvestRecommendations: [
        'Eradicate infected trees and clear a 5-meter cordon sanitaire buffer zone around the outbreak.',
        'Control mealybug vector populations (Planococcoides njalensis) using systemic insecticides or ant control.',
        'Replant cleared areas with certified CSSVD-tolerant hybrid cocoa seedlings.'
      ],
      risks: [
        'Systemic viral infection leading to tree dieback and death within 2-3 years.',
        'Rapid vector-borne transmission via mealybug colonies tended by protective ants.'
      ],
      nextSteps: [
        'Report symptoms to the local Agricultural Extension Service / Cocoa Board.',
        'Establish physical barriers and monitor boundary trees monthly.'
      ],
      gaugeColor: '#F59E0B'
    };
  }

  // 4. Leaf Health, Chlorosis & Micronutrient Deficiencies
  if (
    query.includes('leaf') ||
    query.includes('leaves') ||
    query.includes('chlorosis') ||
    query.includes('yellowing') ||
    query.includes('nutrient') ||
    query.includes('nitrogen') ||
    query.includes('potassium') ||
    query.includes('zinc') ||
    query.includes('magnesium') ||
    categoryFocus === 'leaves'
  ) {
    return {
      isCocoa: true,
      objectType: 'Cocoa Leaf Health Evaluation',
      ripenessLabel: query.includes('yellow') || query.includes('deficiency') ? 'Leaf Chlorosis / Nutrient Deficit' : 'Optimal Leaf Chlorophyll & Health',
      ripenessScore: query.includes('yellow') || query.includes('deficiency') ? 68 : 92,
      weeksToHarvest: 'N/A (Foliar Diagnostics)',
      estimatedAgeWeeks: 'Active Foliage',
      bestHarvestWindow: 'N/A',
      podYieldEstimate: 'Canopy Photosynthesis Support',
      characteristics: query.includes('yellow')
        ? 'Interveinal yellowing (chlorosis) observed on older leaves, indicating potential Nitrogen (N), Magnesium (Mg) or Iron (Fe) deficiency under heavy sun exposure.'
        : 'Uniform deep green leaf lamina with intact venation. No visible feeding trails or necroses.',
      harvestRecommendations: [
        'Apply balanced N-P-K (12-24-18) cocoa fertilizer combined with Magnesium sulfate.',
        'Ensure 40-50% shade cover using shade trees (e.g., Terminalia, Gliricidia) to reduce photo-oxidative leaf stress.',
        'Perform soil pH test; optimal soil pH for cocoa nutrient uptake is 6.0 – 6.8.'
      ],
      risks: [
        'Unmitigated leaf chlorosis reduces photosynthetic capacity, leading to pod abortion (cherelle wilt).',
        'Excess direct sunlight burns delicate flushing leaves.'
      ],
      nextSteps: [
        'Apply organic compost mulching around tree drip-lines.',
        'Re-evaluate foliar coloration in 14 days following fertilizer application.'
      ],
      gaugeColor: query.includes('yellow') ? '#F59E0B' : '#10B981'
    };
  }

  // 5. Cut Bean Fermentation & Post-Harvest Bean Quality
  if (
    query.includes('cut bean') ||
    query.includes('ferment') ||
    query.includes('sweat box') ||
    query.includes('slaty') ||
    query.includes('purple bean') ||
    query.includes('dry') ||
    query.includes('moisture') ||
    query.includes('bean quality') ||
    categoryFocus === 'seeds'
  ) {
    return {
      isCocoa: true,
      objectType: 'Cut Bean Fermentation Diagnostic',
      ripenessLabel: 'Fermentation & Bean Quality Index',
      ripenessScore: 88,
      weeksToHarvest: 'Post-Harvest Processing',
      estimatedAgeWeeks: '6-Day Sweat Box Phase',
      bestHarvestWindow: 'Dry to 7.5% Moisture Level',
      podYieldEstimate: 'Grade A Export Quality Bean Target',
      characteristics:
        'Evaluation of internal bean cotyledon color and fissure structure. Well-fermented beans exhibit deep chocolate brown color and open folds.',
      harvestRecommendations: [
        'Ferment wet beans in wooden sweat-boxes lined with clean banana leaves for 5–6 days.',
        'Turn bean mass at 48 hours and 96 hours to ensure uniform aeration and temperature reach 45°C - 50°C.',
        'Sun-dry beans on raised wooden tables or plastic tarps until moisture content drops to 7.0 - 7.5%.',
        'Discard slaty (unfermented slate-grey) or moldy beans during cut-test sampling.'
      ],
      risks: [
        'Under-fermentation causes high astringency, bitterness, and slaty bean defects.',
        'Drying on bare soil invites Ochratoxin A fungal contamination.'
      ],
      nextSteps: [
        'Perform a 100-bean cut test to record brown vs. purple vs. slaty percentages.',
        'Store dried beans in clean jute sacks in a well-ventilated dry storehouse.'
      ],
      gaugeColor: '#10B981'
    };
  }

  // 6. Pest Control (Capsids / Mirids & Stem Borers)
  if (
    query.includes('capsid') ||
    query.includes('mirid') ||
    query.includes('borer') ||
    query.includes('pest') ||
    query.includes('bug') ||
    query.includes('insect') ||
    query.includes('eating') ||
    query.includes('holes')
  ) {
    return {
      isCocoa: true,
      objectType: 'Pest Impact & Damage Control',
      ripenessLabel: 'Capsid / Pest Activity Detected',
      ripenessScore: 62,
      weeksToHarvest: 'Monitor Pod Health',
      estimatedAgeWeeks: 'Maturing Crop',
      bestHarvestWindow: 'Protect Developing Pods',
      podYieldEstimate: 'Potential Surface Scarring',
      characteristics:
        'Dark sunken feeding scars on pod surface and young shoots, indicative of Sahlbergella singularis or Distantiella theobroma (Capsids/Mirids) feeding.',
      harvestRecommendations: [
        'Spot-spray affected tree pockets with recommended insecticides during peak capsid populations (August - November).',
        'Prune side chupons and canopy gaps where capsids aggregate during sunny midday hours.',
        'Encourage natural predator populations such as weaver ants (Oecophylla longinoda).'
      ],
      risks: [
        'Heavy capsid feeding causes dieback of young shoots ("capsid pockets") and fungal entry points on pods.',
        'Yield losses can reach 30-40% if left untreated during peak flight season.'
      ],
      nextSteps: [
        'Inspect farm monthly during flush periods.',
        'Calibrate knapsack sprayers for even canopy coverage.'
      ],
      gaugeColor: '#F59E0B'
    };
  }

  // 7. Pruning, Shade Canopy & Soil Hydration
  if (
    query.includes('prun') ||
    query.includes('shade') ||
    query.includes('trim') ||
    query.includes('soil') ||
    query.includes('drought') ||
    query.includes('water') ||
    query.includes('mulch') ||
    query.includes('compost')
  ) {
    return {
      isCocoa: true,
      objectType: 'Canopy & Agronomic Field Management',
      ripenessLabel: 'Field Management Advisory',
      ripenessScore: 85,
      weeksToHarvest: 'Routine Agronomic Maintenance',
      estimatedAgeWeeks: 'Perennial Management',
      bestHarvestWindow: 'Optimal Field Maintenance',
      podYieldEstimate: 'Supports Long-term Yield Stability',
      characteristics:
        'Evaluation of canopy structure, light intercept, chupon growth, and soil organic mulch depth.',
      harvestRecommendations: [
        'Perform structural pruning after main harvest (Jan - March) to keep tree height below 3.5 - 4.0 meters.',
        'Remove unwanted chupons (water shoots) twice monthly to prevent nutrient diversion.',
        'Maintain a 5-10cm organic leaf mulch layer around the base of cocoa trunks to retain soil moisture during dry spells.'
      ],
      risks: [
        'Over-pruning exposes branches to trunk borer attacks and sunscald.',
        'Under-pruning creates high humidity microclimates favoring fungal rot.'
      ],
      nextSteps: [
        'Schedule canopy trimming before the onset of the main rainy season.',
        'Check soil moisture depth around cocoa roots.'
      ],
      gaugeColor: '#10B981'
    };
  }

  // 8. Pod Ripeness & Harvest Window (Default for Ripeness or Image Uploads)
  if (
    query.includes('unripe') ||
    query.includes('green') ||
    query.includes('immature') ||
    query.includes('cherelle')
  ) {
    return {
      isCocoa: true,
      objectType: 'Unripe Cocoa Pod',
      ripenessLabel: 'Developing Pod (Green Pericarp)',
      ripenessScore: 45,
      weeksToHarvest: '4 - 6 Weeks',
      estimatedAgeWeeks: '14 - 16 Weeks',
      bestHarvestWindow: 'Wait for Golden-Yellow Color Shift',
      podYieldEstimate: 'Pod Filling Phase (~35-40 Beans developing)',
      characteristics:
        'Firm green pericarp with high chlorophyll content. Pod is in active seed expansion and mucilage accumulation phase.',
      harvestRecommendations: [
        'Do not harvest yet; early picking leads to flat, unfermentable beans with low cocoa butter fat content.',
        'Inspect weekly for cherelle wilt or early Black Pod spots.',
        'Maintain shade cover to protect young pod skin.'
      ],
      risks: [
        'Premature harvesting results in poor bean size, high acidity, and rejection by cocoa buyers.'
      ],
      nextSteps: [
        'Tag pod cluster for re-inspection in 20 days.',
        'Ensure soil hydration remains consistent.'
      ],
      gaugeColor: '#84CC16' // Lime green
    };
  }

  if (
    query.includes('overripe') ||
    query.includes('past peak') ||
    query.includes('dry pod')
  ) {
    return {
      isCocoa: true,
      objectType: 'Overripe Cocoa Pod',
      ripenessLabel: 'Overripe / Past Peak Maturity',
      ripenessScore: 58,
      weeksToHarvest: 'Immediate Pick Required',
      estimatedAgeWeeks: '>22 Weeks',
      bestHarvestWindow: 'Immediate Harvest & Processing',
      podYieldEstimate: 'Risk of Internal Seed Germination',
      characteristics:
        'Dull orange-brown pericarp, tissue softening, indicating pod wall breakdown and drying placenta.',
      harvestRecommendations: [
        'Harvest immediately to prevent seeds from germinating inside the pod cavity.',
        'Sort beans during pod breaking and discard germinated seeds with radical emergence.',
        'Mix with mature ripe pods during fermentation to balance acidity levels.'
      ],
      risks: [
        'Internal seed germination severely lowers bean fat index and market grade.'
      ],
      nextSteps: [
        'Break pods today and inspect internal placenta.',
        'Adjust sweat box aeration if beans are drier than normal.'
      ],
      gaugeColor: '#F59E0B'
    };
  }

  // 9. General Question / General Observation (Dynamic contextual response)
  const isQuestion = query.includes('?') || query.startsWith('how') || query.startsWith('what') || query.startsWith('when') || query.startsWith('why') || query.startsWith('can') || query.startsWith('should');

  return {
    isCocoa: true,
    objectType: hasImage ? 'Cocoa Pod Assessment' : 'Agronomic Query Advisory',
    ripenessLabel: isQuestion ? `Advisory: ${text.length > 35 ? text.substring(0, 35) + '...' : text}` : 'Optimal Cocoa Harvest & Health Advisory',
    ripenessScore: hasImage ? 92 : 88,
    weeksToHarvest: '1 - 2 Weeks',
    estimatedAgeWeeks: '18 - 20 Weeks',
    bestHarvestWindow: 'Harvest when 75%+ of pod pericarp turns yellow-orange',
    podYieldEstimate: 'High Potential (40-48 Grade A Beans per pod)',
    characteristics: text
      ? `Specific Agronomic Focus: "${text}". Optimal cocoa yield requires balancing shade tree canopy (40-50%), regular soil mulching, sanitation harvesting against black pod fungal rot, and a 5-6 day sweat-box fermentation.`
      : 'Visual pericarp coloration, intact venation, optimal cocoa fat content potential.',
    harvestRecommendations: [
      'Harvest pods using sharp pruners, cutting pedicels 1cm from trunk cushion.',
      'Ferment wet beans within 48 hours of pod breaking in wooden sweat boxes.',
      'Maintain weekly sanitation picks to remove diseased pods before fungal spores spread.',
      'Sun-dry fermented beans on raised racks until moisture reaches 7.5%.'
    ],
    risks: [
      'Rain splash during harvest season increases Phytophthora fungal risk.',
      'Over-exposure to direct sunlight without shade trees causes leaf scorch.'
    ],
    nextSteps: [
      'Schedule early morning harvest window for mature pods.',
      'Inspect field block weekly for pest or disease symptoms.'
    ],
    gaugeColor: '#10B981'
  };
}
