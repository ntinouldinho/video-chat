import React from "react";
import "../CSS/Results.css";
import Rating from "react-star-review";

const ProfessionalBlock = ({ person }) => {
  return (
    <a href={"/profile/" + person.name + "/56"}>
      <div className="ProfessionalBlock">
        <div className="leftside" style={{ float: "left" }}>
          
          <span class="caption">
            {person.name} {person.surname} Profession: {person.job}
            <Rating rating={"4"} count={5} />
          </span>
          <img
            alt="profile pic"
            
            src={"https://www.ecpi.edu/sites/default/files/CIV%20Sept%2026.png"}
            width="150px"
            height="120px"
          />
        </div>
        <div className="info">
          m Ipsum. um passages, and more recently with desktop publishing
          software like Aldus PageMaker including versions of Lorem Ipsum. sum
          passages, and more recently with desktop publishing software like
          Aldus PageMaker including versions of Lore sum passages, and more
          recently with desktop publishing software like Aldus PageMaker
          including versions of Lore sum passages, and more recently with
          desktop publishing software like Aldus PageMaker including versions of
          Lore
          m Ipsum. um passages, and more recently with desktop publishing
          software like Aldus PageMaker including versions of Lorem Ipsum. sum
          passages, and more recently with desktop publishing software like
          Aldus PageMaker including versions of Lore sum passages, and more
          recently with desktop publishing software like Aldus PageMaker
          including versions of Lore sum passages, and more recently with
          desktop publishing software like Aldus PageMaker including versions of
          Lore
          m Ipsum. um passages, and more recently with desktop publishing
          software like Aldus PageMaker including versions of Lorem Ipsum. sum
          passages, and more recently with desktop publishing software like
          Aldus PageMaker including versions of Lore sum passages, and more
          recently with desktop publishing software like Aldus PageMaker
          including versions of Lore sum passages, and more recently with
          desktop publishing software like Aldus PageMaker including versions of
          Lore
        </div>
      </div>
    </a>
  );
};

export default ProfessionalBlock;
