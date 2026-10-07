/**
 * Every batch of case types written after the first library (2026-10-07).
 * Each batch file is written by one author; this index only gathers them.
 */

import { TYPES_SC_MONEY_OWED_1 } from "./sc-money-owed-1";
import { TYPES_SC_MONEY_OWED_2 } from "./sc-money-owed-2";
import { TYPES_SC_GOODS_AND_SERVICES_1 } from "./sc-goods-and-services-1";
import { TYPES_SC_GOODS_AND_SERVICES_2 } from "./sc-goods-and-services-2";
import { TYPES_SC_GOODS_AND_SERVICES_3 } from "./sc-goods-and-services-3";
import { TYPES_SC_GOODS_AND_SERVICES_4 } from "./sc-goods-and-services-4";
import { TYPES_SC_GOODS_AND_SERVICES_5 } from "./sc-goods-and-services-5";
import { TYPES_SC_PROPERTY_DAMAGE_1 } from "./sc-property-damage-1";
import { TYPES_SC_PROPERTY_DAMAGE_2 } from "./sc-property-damage-2";
import { TYPES_SC_INJURY_1 } from "./sc-injury-1";
import { TYPES_SC_INJURY_2 } from "./sc-injury-2";
import { TYPES_SC_NEIGHBOURS_1 } from "./sc-neighbours-1";
import { TYPES_SC_NEIGHBOURS_2 } from "./sc-neighbours-2";
import { TYPES_SC_WORK_1 } from "./sc-work-1";
import { TYPES_SC_HOUSING_1 } from "./sc-housing-1";
import { TYPES_SC_HOUSING_2 } from "./sc-housing-2";
import { TYPES_SC_FAMILY_ADJACENT_1 } from "./sc-family-adjacent-1";
import { TYPES_SC_OTHER_1 } from "./sc-other-1";
import { TYPES_SC_OTHER_2 } from "./sc-other-2";
import { TYPES_SC_OTHER_3 } from "./sc-other-3";
import { TYPES_SC_DEFENDANT_SIDE_1 } from "./sc-defendant-side-1";
import { TYPES_SC_DEFENDANT_SIDE_2 } from "./sc-defendant-side-2";
import { TYPES_CIVIL_1 } from "./civil-1";
import { TYPES_CIVIL_2 } from "./civil-2";
import { TYPES_FAMILY_1 } from "./family-1";
import { TYPES_FAMILY_2 } from "./family-2";

import type { ClaimType } from "../claimTypes";

export const MORE_SMALL_CLAIMS_TYPES: ClaimType[] = [...TYPES_SC_MONEY_OWED_1, ...TYPES_SC_MONEY_OWED_2, ...TYPES_SC_GOODS_AND_SERVICES_1, ...TYPES_SC_GOODS_AND_SERVICES_2, ...TYPES_SC_GOODS_AND_SERVICES_3, ...TYPES_SC_GOODS_AND_SERVICES_4, ...TYPES_SC_GOODS_AND_SERVICES_5, ...TYPES_SC_PROPERTY_DAMAGE_1, ...TYPES_SC_PROPERTY_DAMAGE_2, ...TYPES_SC_INJURY_1, ...TYPES_SC_INJURY_2, ...TYPES_SC_NEIGHBOURS_1, ...TYPES_SC_NEIGHBOURS_2, ...TYPES_SC_WORK_1, ...TYPES_SC_HOUSING_1, ...TYPES_SC_HOUSING_2, ...TYPES_SC_FAMILY_ADJACENT_1, ...TYPES_SC_OTHER_1, ...TYPES_SC_OTHER_2, ...TYPES_SC_OTHER_3, ...TYPES_SC_DEFENDANT_SIDE_1, ...TYPES_SC_DEFENDANT_SIDE_2];
export const MORE_CIVIL_TYPES: ClaimType[] = [...TYPES_CIVIL_1, ...TYPES_CIVIL_2];
export const MORE_FAMILY_TYPES: ClaimType[] = [...TYPES_FAMILY_1, ...TYPES_FAMILY_2];
