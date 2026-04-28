import React, { useState } from 'react';
import { t, useLang } from '../i18n';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';

export default function RatingModal(props) {
  useLang();
  var _rating = useState(0); var rating = _rating[0]; var setRating = _rating[1];
  var _comment = useState(''); var comment = _comment[0]; var setComment = _comment[1];

  if (!props.visible) return null;

  return (
    <Modal transparent animationType="fade" visible={props.visible} onRequestClose={props.onClose}>
      <View style={s.overlay}>
        <View style={s.modal}>
          <Text style={s.title}>{props.title || 'Donner une note'}</Text>
          <Text style={s.subtitle}>{props.subtitle || ''}</Text>

          <View style={s.stars}>
            {[1,2,3,4,5].map(function(n) {
              return (
                <TouchableOpacity key={n} onPress={function(){setRating(n);}}>
                  <Text style={[s.star, n <= rating && s.starActive]}>{n <= rating ? '★' : '☆'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.ratingLabel}>
            {rating === 0 ? 'Appuyez pour noter' : rating === 1 ? 'Mauvais' : rating === 2 ? 'Moyen' : rating === 3 ? 'Bien' : rating === 4 ? 'Tres bien' : 'Excellent !'}
          </Text>

          <TextInput style={s.input} placeholder="Commentaire (optionnel)" placeholderTextColor="#9B9B9B" value={comment} onChangeText={setComment} multiline />

          <View style={s.btns}>
            <TouchableOpacity style={s.cancelBtn} onPress={props.onClose}>
              <Text style={s.cancelBtnT}>{t('common_cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, rating === 0 && {opacity:0.4}]} disabled={rating === 0} onPress={function(){
              if (rating > 0) { props.onSubmit(rating, comment.trim()); setRating(0); setComment(''); }
            }}>
              <Text style={s.submitBtnT}>{t('common_send')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

var s = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:20},
  modal:{backgroundColor:'#fff',borderRadius:20,padding:24,width:'100%',maxWidth:360,alignItems:'center'},
  title:{fontSize:18,fontWeight:'700',color:'#141414',marginBottom:4},
  subtitle:{fontSize:13,color:'#9B9B9B',marginBottom:16,textAlign:'center'},
  stars:{flexDirection:'row',gap:8,marginBottom:8},
  star:{fontSize:36,color:'#D0D0D0'},
  starActive:{color:'#FFB800'},
  ratingLabel:{fontSize:13,color:'#C8965A',fontWeight:'600',marginBottom:16},
  input:{borderWidth:1,borderColor:'#E0E0E0',borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:'#141414',width:'100%',minHeight:60,textAlignVertical:'top',marginBottom:16},
  btns:{flexDirection:'row',gap:12,width:'100%'},
  cancelBtn:{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:'#E0E0E0',alignItems:'center'},
  cancelBtnT:{fontSize:14,fontWeight:'600',color:'#9B9B9B'},
  submitBtn:{flex:1,paddingVertical:12,borderRadius:12,backgroundColor:'#C8965A',alignItems:'center'},
  submitBtnT:{fontSize:14,fontWeight:'700',color:'#fff'},
});
