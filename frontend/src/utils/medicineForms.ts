import formTablet from '../assets/forms/form_tablet.png';
import formCapsule from '../assets/forms/form_capsule.png';
import formCaplet from '../assets/forms/form_caplet.png';
import formSoftgel from '../assets/forms/form_softgel.png';
import formSyrup from '../assets/forms/form_syrup.png';
import formSuspension from '../assets/forms/form_suspension.png';
import formCream from '../assets/forms/form_cream.png';
import formOintment from '../assets/forms/form_ointment.png';
import formGel from '../assets/forms/form_gel.png';
import formLotion from '../assets/forms/form_lotion.png';
import formEyeDrops from '../assets/forms/form_eye_drops.png';
import formEarDrops from '../assets/forms/form_ear_drops.png';
import formNasalSpray from '../assets/forms/form_nasal_spray.png';

// Fallback images for types we haven't generated yet due to API limits
// We map them to the closest generated visual equivalent for now
const formImages: Record<string, string> = {
  // Oral Solids
  'Tablet': formTablet,
  'Capsule': formCapsule,
  'Caplet': formCaplet,
  'Softgel': formSoftgel,
  'Chewable Tablet': formTablet,
  'Effervescent Tablet': formTablet,
  'Dispersible Tablet': formTablet,
  'Lozenge': formTablet,
  'Powder': formTablet, // placeholder
  'Granules': formTablet, // placeholder

  // Liquids
  'Syrup': formSyrup,
  'Suspension': formSuspension,
  'Solution': formSuspension,
  'Oral Drops': formEarDrops,
  'Mouthwash': formSyrup,

  // Topical
  'Cream': formCream,
  'Ointment': formOintment,
  'Gel': formGel,
  'Lotion': formLotion,
  'Foam': formLotion,
  'Paste': formOintment,

  // Nasal / Eye / Ear
  'Eye Drops': formEyeDrops,
  'Eye Ointment': formOintment,
  'Ear Drops': formEarDrops,
  'Nasal Drops': formEyeDrops,
  'Nasal Spray': formNasalSpray,

  // Injectable / Respiratory / Other placeholders
  'Injection': formSuspension,
  'Vial': formSuspension,
  'Ampoule': formSuspension,
  'Prefilled Syringe': formCapsule,
  'IV Bag': formSuspension,
  
  'Inhaler': formNasalSpray,
  'Nebulizer Solution': formSuspension,

  'Suppository': formCaplet,
  'Pessary': formCaplet,
  'Enema': formLotion,

  'Transdermal Patch': formTablet,
  
  'Blister Pack': formTablet,
  'Sachet': formTablet,
};

/**
 * Returns the corresponding professional image for a given medicine form.
 * If the form is not found, returns the generic tablet image as a fallback.
 */
export const getMedicineFormImage = (formName: string): string => {
  return formImages[formName] || formTablet;
};
