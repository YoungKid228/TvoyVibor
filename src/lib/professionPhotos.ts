import accountantImg from "../assets/professions/accountant.webp";
import businessAnalystImg from "../assets/professions/business_analyst.webp";
import creditSpecialistImg from "../assets/professions/credit_specialist.webp";
import economicSecurityImg from "../assets/professions/economic_security.webp";
import economistImg from "../assets/professions/economist.webp";
import financialAnalystImg from "../assets/professions/financial_analyst.webp";
import insuranceAgentImg from "../assets/professions/insurance_agent.webp";
import procurementSpecialistImg from "../assets/professions/procurement_specialist.webp";
import taxConsultantImg from "../assets/professions/tax_consultant.webp";
import budgetingSpecialistImg from "../assets/professions/budgeting_specialist.webp";

/** Фотографии профессий: id профессии -> изображение */
const professionPhotos: Record<string, string> = {
  accountant: accountantImg,
  business_analyst: businessAnalystImg,
  budgeting_specialist: budgetingSpecialistImg,
  credit_specialist: creditSpecialistImg,
  economic_security: economicSecurityImg,
  economist: economistImg,
  financial_analyst: financialAnalystImg,
  insurance_agent: insuranceAgentImg,
  procurement_specialist: procurementSpecialistImg,
  tax_consultant: taxConsultantImg,
};

/** Фото профессии или undefined, если фотографии ещё нет */
export function professionPhoto(professionId: string): string | undefined {
  return professionPhotos[professionId];
}
